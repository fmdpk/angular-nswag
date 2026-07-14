const fs = require("fs");

const swagger = JSON.parse(fs.readFileSync("./swagger.json", "utf8"));

const tags = ["Auth", "Todos", "Tasks", "Items"];

for (const tag of tags) {
  const clone = structuredClone(swagger);

  clone.paths = {};

  for (const [path, methods] of Object.entries(swagger.paths)) {
    const filteredMethods = {};

    for (const [method, operation] of Object.entries(methods)) {
      if (operation.tags?.includes(tag)) {
        filteredMethods[method] = operation;
      }
    }

    if (Object.keys(filteredMethods).length) {
      clone.paths[path] = filteredMethods;
    }
  }

  fs.writeFileSync(
    `./${tag.toLowerCase()}.json`,
    JSON.stringify(clone, null, 2),
  );
}
