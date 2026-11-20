/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Node Runtime Security Pin Verification
 * 📄 File: scripts/node-runtime-pin.test.mjs
 * 🎯 Purpose: Keeps local, package and CI Node runtime pins aligned.
 * 🏗️ Architecture: Repository security policy; no network requests.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = new URL("../", import.meta.url);
const patchedRuntime = "24.22.3";

function repositoryFile(path) {
  return readFileSync(new URL(path, repositoryRoot), "utf8");
}

test("local and package Node pins use the patched runtime", () => {
  const packageJson = JSON.parse(repositoryFile("package.json"));

  assert.equal(repositoryFile(".node-version").trim(), patchedRuntime);
  assert.equal(repositoryFile(".nvmrc").trim(), patchedRuntime);
  assert.equal(packageJson.engines.node, patchedRuntime);
});

test("every GitHub workflow obtains Node from the canonical pin", () => {
  const workflowDirectory = new URL(".github/workflows/", repositoryRoot);
  const workflows = readdirSync(workflowDirectory).filter((name) =>
    name.endsWith(".yml"),
  );
  let setupCount = 0;

  for (const workflow of workflows) {
    const source = readFileSync(
      join(fileURLToPath(workflowDirectory), workflow),
      "utf8",
    );
    const usesSetupNode = source.includes("actions/setup-node@");
    if (!usesSetupNode) continue;
    setupCount += 1;
    assert.match(
      source,
      /node-version-file:\s*\.node-version/,
      `${workflow} must consume .node-version`,
    );
    assert.doesNotMatch(
      source,
      /node-version:\s*['\"]?\d/,
      `${workflow} must not introduce an independent literal Node pin`,
    );
  }

  assert.ok(
    setupCount > 0,
    "at least one workflow must verify the runtime pin",
  );
});
