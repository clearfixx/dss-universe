/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Dependency Security
 * 📄 File: scripts/braces-patch.test.mjs
 *
 * 🎯 Purpose:
 * Verifies the installed braces patch against deep input and normal glob use.
 *
 * 🧠 Responsibilities:
 * • exercises the Nest schema-tooling dependency chain;
 * • checks bounded parser and AST traversal behavior;
 * • preserves representative public API behavior.
 *
 * 🏗️ Architecture:
 * Standalone dependency regression tests; no application runtime imports.
 *
 * ⚠️ Important:
 * A passing patch test does not suppress or clear npm security advisories.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const apiRequire = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const nestRequire = createRequire(apiRequire.resolve("@nestjs/graphql"));
const morphRequire = createRequire(nestRequire.resolve("ts-morph"));
const commonRequire = createRequire(morphRequire.resolve("@ts-morph/common"));
const globRequire = createRequire(commonRequire.resolve("fast-glob"));
const matchRequire = createRequire(globRequire.resolve("micromatch"));
const braces = matchRequire("braces");
const micromatch = globRequire("micromatch");

const rejectsDepth = (operation) =>
  assert.throws(operation, {
    name: "RangeError",
    message: "braces AST exceeds maximum depth of 128",
  });

for (const method of ["parse", "compile", "expand", "stringify"]) {
  test(`${method} rejects deeply nested braces below maxLength`, () => {
    rejectsDepth(() =>
      braces[method]("{".repeat(2000) + "a,b" + "}".repeat(2000)),
    );
  });
  test(`${method} rejects deeply nested parentheses`, () => {
    rejectsDepth(() =>
      braces[method]("(".repeat(2000) + "x" + ")".repeat(2000)),
    );
  });
}

test("parser permits 127 containers and rejects 128, regardless of options", () => {
  const permitted = "{".repeat(127) + "a,b" + "}".repeat(127);
  assert.ok(braces.compile(permitted).includes("a|b"));
  const excessive = "{".repeat(128) + "a,b" + "}".repeat(128);
  rejectsDepth(() => braces.parse(excessive, { maxDepth: Infinity }));
  rejectsDepth(() => braces.parse("{".repeat(2000)));
  rejectsDepth(() => braces.parse("({".repeat(100) + "x" + "})".repeat(100)));
});

for (const method of ["compile", "expand", "stringify"]) {
  test(`${method} rejects supplied deep or cyclic child ASTs`, () => {
    let ast = { type: "text", value: "x" };
    for (let index = 0; index < 2000; index++) {
      ast = { type: "root", nodes: [ast] };
    }
    rejectsDepth(() => braces[method](ast));
    const cycle = { type: "root", nodes: [] };
    cycle.nodes.push(cycle);
    rejectsDepth(() => braces[method](cycle));
  });
}

test("normal alternatives, ranges, escaping and AST parent links are preserved", () => {
  assert.deepEqual(braces.expand("src/{api,web}/*.{ts,tsx}"), [
    "src/api/*.ts",
    "src/api/*.tsx",
    "src/web/*.ts",
    "src/web/*.tsx",
  ]);
  assert.deepEqual(braces.expand("v{1..3}"), ["v1", "v2", "v3"]);
  assert.deepEqual(braces.expand("{a,{b,c}}"), ["a", "b", "c"]);
  assert.deepEqual(braces.expand("\\{literal\\}"), ["{literal}"]);
  const ast = braces.parse("src/{api,web}");
  assert.equal(braces.stringify(ast), "src/{api,web}");
  assert.equal(braces.compile(ast), "src/(api|web)");
  assert.deepEqual(braces.expand(ast), ["src/api", "src/web"]);
  assert.deepEqual(braces(["{a,b}", "{c,d}"]), ["(a|b)", "(c|d)"]);
});

test("micromatch preserves representative repository file selection", () => {
  assert.deepEqual(
    micromatch(
      [
        "src/api/main.ts",
        "src/web/page.tsx",
        "src/web/page.css",
        "test/main.ts",
      ],
      "src/{api,web}/**/*.{ts,tsx}",
    ),
    ["src/api/main.ts", "src/web/page.tsx"],
  );
});
