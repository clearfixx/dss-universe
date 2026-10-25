/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Dependency Security Verification
 * 📄 File: scripts/dependency-security-versions.test.mjs
 * 🎯 Purpose: Pins supported security floors in actual resolved consumer paths.
 * 🧠 Responsibilities: checks framework alignment and representative transitive consumers.
 * 🏗️ Architecture: Repository test policy; no application or network requests.
 * ⚠️ Important: Complements the full audit; does not prove exploit unreachability.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";

const web = createRequire(new URL("../apps/web/package.json", import.meta.url));
const api = createRequire(new URL("../apps/api/package.json", import.meta.url));

function resolvedPackage(consumer, name, entrypoint = name) {
  let directory = dirname(consumer.resolve(entrypoint));
  while (true) {
    const path = join(directory, "package.json");
    if (existsSync(path)) {
      const metadata = JSON.parse(readFileSync(path, "utf8"));
      if (metadata.name === name)
        return { version: metadata.version, require: createRequire(path) };
    }
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`Cannot locate ${name} metadata`);
    directory = parent;
  }
}

function atLeast(actual, floor) {
  assert.match(actual, /^\d+\.\d+\.\d+$/, "stable releases only");
  const parts = actual.split(".").map(Number);
  const minimum = floor.split(".").map(Number);
  const difference =
    parts
      .map((value, index) => value - minimum[index])
      .find((value) => value !== 0) ?? 0;
  assert.ok(difference >= 0, `${actual} is below patched floor ${floor}`);
  assert.equal(parts[0], minimum[0], "no unsupported major substitution");
}

test("resolved Next and eslint-config-next share the patched release", () => {
  const next = resolvedPackage(web, "next");
  atLeast(next.version, "16.4.1");
  assert.equal(
    resolvedPackage(web, "eslint-config-next").version,
    next.version,
  );
  atLeast(resolvedPackage(next.require, "sharp").version, "0.35.5");
});

test("resolved Web and supported CLI consumers use patched Zod 4", () => {
  const cli = resolvedPackage(web, "shadcn");
  atLeast(cli.version, "4.22.1");
  const registry = resolvedPackage(cli.require, "@shadcn/registry");
  const mcp = resolvedPackage(
    cli.require,
    "@modelcontextprotocol/sdk",
    "@modelcontextprotocol/sdk/client",
  );
  for (const consumer of [web, cli.require, registry.require, mcp.require])
    atLeast(resolvedPackage(consumer, "zod").version, "4.6.6");
});

test("actual Apollo and Nest Express paths use patched parsers", () => {
  const apollo = resolvedPackage(api, "@apollo/server");
  const platform = resolvedPackage(api, "@nestjs/platform-express");
  const express = resolvedPackage(platform.require, "express");
  for (const consumer of [apollo.require, express.require])
    atLeast(resolvedPackage(consumer, "body-parser").version, "2.4.0");
  atLeast(resolvedPackage(platform.require, "multer").version, "2.5.0");
});

test("actual CLI and jsdom paths use patched undici 7", () => {
  const cli = resolvedPackage(web, "shadcn");
  const jsdom = resolvedPackage(web, "jsdom");
  for (const consumer of [cli.require, jsdom.require])
    atLeast(resolvedPackage(consumer, "undici").version, "7.30.1");
});
