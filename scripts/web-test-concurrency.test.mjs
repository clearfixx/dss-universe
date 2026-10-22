/**
 * DSS Universe — Web Verification Policy
 * File: scripts/web-test-concurrency.test.mjs
 * Purpose: Resolve real Vitest config and preserve bounded workers without weaker tests.
 * Important: No browser, application server or database is started.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

const web = fileURLToPath(new URL("../apps/web/", import.meta.url));
const requireWeb = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const { resolveConfig } = await import(
  pathToFileURL(requireWeb.resolve("vitest/node")).href
);

for (const enabled of [false, true]) {
  test(`real Web config bounds workers with coverage=${enabled}`, async () => {
    const { vitestConfig } = await resolveConfig({
      root: web,
      run: true,
      coverage: { enabled },
    });
    assert.equal(vitestConfig.maxWorkers, 2);
    assert.equal(vitestConfig.testTimeout, 5000);
    assert.equal(vitestConfig.retry ?? 0, 0);
    assert.equal(vitestConfig.bail ?? 0, 0);
    assert.equal(vitestConfig.environment, "jsdom");
    assert.equal(vitestConfig.coverage.provider, "v8");
    assert.equal(vitestConfig.coverage.enabled, enabled);
    assert.equal(vitestConfig.fileParallelism ?? true, true);
  });
}
