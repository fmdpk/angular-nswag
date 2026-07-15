const fs = require("fs");
const path = require("path");

const inputFile = path.join(__dirname, "../swagger.json");
const outputDir = path.join(__dirname, "../src/app/generated");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
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

  const filename = `${groupName}.swagger.json`;

  fs.writeFileSync(
    path.join(outputDir, filename),
    JSON.stringify(result, null, 2)
  );

  console.log(`Generated ${filename}`);
}
