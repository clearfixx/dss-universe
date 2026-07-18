import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

const root = process.cwd();
const modulesRoot = join(root, "apps/api/src/modules");
const violations = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else if (extname(entry.name) === ".ts") {
      files.push(path);
    }
  }

  return files;
}

for (const file of await walk(modulesRoot)) {
  const source = await readFile(file, "utf8");
  const path = relative(root, file);
  const normalizedPath = path.split(sep).join("/");
  const moduleMatch = normalizedPath.match(/modules\/([^/]+)\//);
  const owner = moduleMatch?.[1];

  if (normalizedPath.includes("/domain/")) {
    if (
      /from\s+["'][^"']*\/(application|infrastructure|presentation)\//.test(
        source,
      )
    ) {
      violations.push(`${path}: domain imports an outer layer`);
    }
  }

  if (
    normalizedPath.includes("/presentation/") &&
    /PrismaService|infrastructure\/repositories/.test(source)
  ) {
    violations.push(`${path}: presentation bypasses the application boundary`);
  }

  for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
    const importedModule = match[1].match(
      /modules\/([^/]+)\/infrastructure\//,
    )?.[1];

    if (importedModule && importedModule !== owner) {
      violations.push(
        `${path}: imports infrastructure owned by ${importedModule}`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error("Architecture boundary violations:\n" + violations.join("\n"));
  process.exit(1);
}

console.log("Architecture boundaries are valid.");
