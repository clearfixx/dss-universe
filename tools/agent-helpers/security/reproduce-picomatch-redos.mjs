import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const store = resolve("node_modules/.pnpm");
const copies = readdirSync(store).filter((name) =>
  name.startsWith("picomatch@"),
);

for (const copy of copies) {
  const version = copy.slice("picomatch@".length).split("_")[0];
  const packageRoot = resolve(store, copy, "node_modules/picomatch");
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
  const observation = {
    version,
    status: result.status,
    signal: result.signal,
    error: result.error?.code,
    output: result.stdout,
  };
  console.log(JSON.stringify(observation));
  assert.equal(
    result.status,
    0,
    `picomatch ${version} exceeded the time bound`,
  );
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.matched, false);
  assert.ok(parsed.elapsedMs < 1_000);
}
