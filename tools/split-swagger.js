const fs = require("fs");
const path = require("path");
const {execSync} = require("child_process");

const inputFile = path.join(__dirname, "../swagger.json");
const outputDirSwagger = path.join(__dirname, "../src/app/generated/swagger");
const outputDirNswag = path.join(__dirname, "../src/app/generated/nswag");
const template = fs.readFileSync(
  path.join(__dirname, "../templates/client.nswag.json"),
  "utf8"
);

if (!fs.existsSync(outputDirSwagger)) {
  fs.mkdirSync(outputDirSwagger, {recursive: true});
}

if (!fs.existsSync(outputDirNswag)) {
  fs.mkdirSync(outputDirNswag, {recursive: true});
}

const swagger = JSON.parse(fs.readFileSync(inputFile, "utf8"));

const PREFIX_REGEX = /^\/api\/Service\/([^\/]+)/;

const groups = {};

for (const route of Object.keys(swagger.paths)) {

  const match = route.match(PREFIX_REGEX);

  if (!match)
    continue;

  const group = match[1];

  groups[group] ??= {};

  groups[group][route] = swagger.paths[route];
}

function collectRefs(obj, refs = new Set()) {

  if (!obj)
    return refs;

  if (Array.isArray(obj)) {

    obj.forEach(x => collectRefs(x, refs));

    return refs;
  }

  if (typeof obj !== "object")
    return refs;

  if (obj.$ref) {

    const name = obj.$ref.split("/").pop();

    refs.add(name);
  }

  for (const value of Object.values(obj))
    collectRefs(value, refs);

  return refs;
}

function resolveSchemas(refs, allSchemas) {

  const collected = {};

  const visited = new Set();

  function visit(schemaName) {

    if (visited.has(schemaName))
      return;

    visited.add(schemaName);

    const schema = allSchemas[schemaName];

    if (!schema)
      return;

    collected[schemaName] = schema;

    const nested = collectRefs(schema);

    nested.forEach(visit);
  }

  refs.forEach(visit);

  return collected;
}


for (const [groupName, paths] of Object.entries(groups)) {

  const refs = new Set();

  Object.values(paths).forEach(pathItem => collectRefs(pathItem, refs));

  const schemas = resolveSchemas(
    refs,
    swagger.components.schemas
  );

  const result = {
    openapi: swagger.openapi,
    info: {
      ...swagger.info,
      title: `${swagger.info.title} - ${groupName}`
    },
    paths,
    components: {
      schemas,
      securitySchemes: swagger.components.securitySchemes
    },
    security: swagger.security
  };

  const kebab = groupName
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();

  const filename = `${kebab}.swagger.json`;

  fs.writeFileSync(
    path.join(outputDirSwagger, filename),
    JSON.stringify(result, null, 2)
  );

  console.log(`Generated ${filename}`);

  const nswag = template
    .replace("__SWAGGER__", `../../../../src/app/generated/swagger/${kebab}.swagger.json`)
    .replace(
      "__OUTPUT__",
      `../../../../src/app/api/${kebab}/${kebab}.client.ts`
    );

  fs.writeFileSync(
    path.join(outputDirNswag, `${kebab}.nswag.json`),
    nswag
  );
}

const files = fs
  .readdirSync(outputDirNswag)
  .filter(f => f.endsWith(".nswag.json"))
  .sort();

for (const file of files) {
  console.log(`Running ${file}...`);
  execSync(`nswag run "${path.join(outputDirNswag, file)}"`, {
    stdio: "inherit"
  });
}
