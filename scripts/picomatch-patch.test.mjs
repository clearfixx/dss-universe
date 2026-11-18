import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const store = resolve(root, "node_modules/.pnpm");
const expected = new Set(["2.3.2", "4.0.4", "4.0.7"]);
const copies = readdirSync(store)
  .filter((name) => name.startsWith("picomatch@"))
  .map((name) => ({
    name,
    version: name.slice("picomatch@".length).split("_")[0],
    packageRoot: resolve(store, name, "node_modules/picomatch"),
  }));

test("installed picomatch inventory is exactly the reviewed patched versions", () => {
  assert.deepEqual(new Set(copies.map(({ version }) => version)), expected);
});

for (const { name, version, packageRoot } of copies) {
  test(`${name} rejects the single-branch repeated-extglob ReDoS vector`, () => {
    const source = `
      const picomatch = require(${JSON.stringify(packageRoot)});
      const started = Date.now();
      const matched = picomatch.isMatch('a'.repeat(42) + '!', '+(?*a)');
      process.stdout.write(JSON.stringify({ matched, elapsedMs: Date.now() - started }));
    `;
    const result = spawnSync(process.execPath, ["-e", source], {
      encoding: "utf8",
      timeout: 1_500,
      windowsHide: true,
    });
    assert.equal(result.status, 0, `picomatch ${version} exceeded the bound`);
    const observation = JSON.parse(result.stdout);
    assert.equal(observation.matched, false);
    assert.ok(observation.elapsedMs < 1_000);
  });

  test(`${name} preserves ordinary wildcard, bracket and nested-extglob behavior`, () => {
    const isMatch = require(resolve(packageRoot, "index.js")).isMatch;
    assert.equal(isMatch("src/api/file.ts", "src/**/?(*.)ts"), true);
    assert.equal(isMatch("abc", "+(a|b|c)"), true);
    assert.equal(isMatch("xa", "+([?*]a)"), false);
    assert.equal(isMatch("?a", "+([?*]a)"), true);
  });
}
