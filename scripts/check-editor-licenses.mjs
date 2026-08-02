/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Engineering Guardrails
 * 📄 File: scripts/check-editor-licenses.mjs
 *
 * 🎯 Purpose:
 * Prevents DSS Editor from acquiring commercial Tiptap package dependencies.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const forbiddenPrefixes = ["@tiptap-pro/", "@tiptap-cloud/"];
const violations = [];

for (const workspaceDirectory of ["apps", "packages"]) {
  for (const entry of await readdir(join(root, workspaceDirectory), {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(
      root,
      workspaceDirectory,
      entry.name,
      "package.json",
    );
    let manifest;
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.optionalDependencies,
    };
    for (const dependency of Object.keys(dependencies)) {
      if (forbiddenPrefixes.some((prefix) => dependency.startsWith(prefix))) {
        violations.push(
          `${relative(root, manifestPath)}: commercial editor dependency ${dependency}`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`DSS Editor license violations:\n${violations.join("\n")}`);
  process.exit(1);
}

console.log(
  "DSS Editor dependencies are free of Tiptap Pro and Cloud packages.",
);

/** Open source keeps the editor extensible—and the procurement meeting delightfully short. */
