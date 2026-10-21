/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Architecture Tooling
 * 📄 File: scripts/architecture/analyze-file-graph.test.mjs
 *
 * 🎯 Purpose:
 * Pins local TypeScript file-graph resolution and conservative cycle detection.
 *
 * 🧠 Responsibilities:
 * • tests aliases, extensions, type and loader edges without repository writes;
 * • preserves deterministic diagnostics and explicit graph exclusions.
 *
 * 🏗️ Architecture:
 * Pure synthetic-source tests; no production resolver host is replaced.
 *
 * ⚠️ Important:
 * Passing fixtures do not certify runtime DI or external workspace dependencies.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { test } from "node:test";
import { deepEqual, equal, ok, throws } from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import {
  analyzeFileGraph,
  parseGraphCompilerOptions,
} from "./analyze-file-graph.mjs";

const requireApi = createRequire(
  new URL("../../apps/api/package.json", import.meta.url),
);
const { ModuleResolutionKind, ModuleKind } = requireApi("typescript");
const root = resolve(".");
const options = {
  module: ModuleKind.NodeNext,
  moduleResolution: ModuleResolutionKind.NodeNext,
  baseUrl: root,
  paths: { "@api/*": ["apps/api/src/*"] },
};
const file = (name, source) => ({ path: `apps/api/src/${name}`, source });
const analyze = (files) => analyzeFileGraph(files, options, root);

test("graph config parser retains actual baseUrl/path resolution and JSON comments", () => {
  const parsed = parseGraphCompilerOptions(
    '{ // retained JSONC syntax\n "compilerOptions": {"baseUrl":"../..", "paths":{"@api/*":["apps/api/src/*"]}, "moduleResolution":"nodenext", "module":"nodenext"}}',
    resolve(root, "apps/api"),
  );
  equal(parsed.baseUrl.replaceAll("\\", "/"), root.replaceAll("\\", "/"));
  deepEqual(parsed.paths, options.paths);
  equal(parsed.moduleResolution, options.moduleResolution);
});
test("graph config parser rejects invalid syntax and unknown compiler options", () => {
  throws(() => parseGraphCompilerOptions("{", root));
  throws(() =>
    parseGraphCompilerOptions(
      '{"compilerOptions":{"inventedOption":true}}',
      root,
    ),
  );
});
test("graph config parser never silently ignores inherited configuration", () => {
  throws(
    () => parseGraphCompilerOptions('{"extends":"./base.json"}', root),
    /inheritance requires explicit resolver support/,
  );
});

for (const dependency of [
  "import { B } from './b';",
  "export { B } from './b';",
  "import type { B } from './b';",
  "type B = import('./b').B;",
  "import B = require('./b');",
  "const b = require('./b');",
  "import('./b');",
  "import { B } from '@api/core/b';",
  "import { B } from './b.js';",
]) {
  test(`file graph detects a cycle through ${dependency}`, () => {
    const findings = analyze([
      file("core/a.ts", dependency),
      file("core/b.ts", "import './a';"),
    ]);
    equal(findings.length, 1);
    equal(findings[0].rule, "file-cycle");
    ok(findings[0].detail.includes("core/a.ts, apps/api/src/core/b.ts"));
  });
}

test("file graph resolves directory barrels and sorts input-independent groups", () => {
  const files = [
    file("core/config/index.ts", "export { A } from './a';"),
    file("core/config/a.ts", "import '@api/core/config';"),
  ];
  equal(analyze(files)[0].rule, "file-cycle");
  deepEqual(analyze(files), analyze(files.toReversed()));
});
test("file graph detects self-loops outside feature/Core directories", () => {
  equal(
    analyze([file("health/self.ts", "import './self';")])[0].rule,
    "file-cycle",
  );
});
test("file graph normalizes Windows source paths", () => {
  const files = [file("core/a.ts", "import './a';")];
  deepEqual(
    analyze(files),
    analyze(
      files.map((input) => ({
        ...input,
        path: input.path.replaceAll("/", "\\"),
      })),
    ),
  );
});
test("file graph diagnoses missing local sources instead of dropping edges", () => {
  deepEqual(
    analyze([file("core/a.ts", "import './missing';")]).map(
      ({ rule, detail }) => ({ rule, detail }),
    ),
    [{ rule: "unresolved-local-import", detail: "./missing" }],
  );
});
test("file graph respects supplied alias configuration", () => {
  const changedOptions = { ...options, paths: { "@api/*": ["elsewhere/*"] } };
  equal(
    analyzeFileGraph(
      [file("core/a.ts", "import '@api/core/a';")],
      changedOptions,
      root,
    )[0].rule,
    "unresolved-local-import",
  );
});
test("file graph excludes tests/declarations and does not resolve outside-API packages", () => {
  deepEqual(
    analyze([
      file("core/a.ts", "import 'some-package'; import '@shared/value';"),
      file("core/a.spec.ts", "import './missing';"),
      file("core/a.d.ts", "import './missing';"),
    ]),
    [],
  );
});
test("file graph reports parse errors outside the old feature scope", () => {
  ok(
    analyze([file("health/a.ts", "import { broken")]).some(
      ({ rule }) => rule === "file-graph-parse-error",
    ),
  );
});
test("file graph accepts acyclic local imports without invented cycles", () => {
  deepEqual(
    analyze([
      file("core/a.ts", "import './b';"),
      file("core/b.ts", "export const value = 1;"),
    ]),
    [],
  );
});

test("file graph exposes nonliteral loaders outside the old feature scope", () => {
  const findings = analyze([
    file("health/loader.ts", "import(path); require(path);"),
  ]);
  equal(findings.length, 1);
  equal(findings[0].rule, "file-graph-unresolved-dynamic-import");
});
