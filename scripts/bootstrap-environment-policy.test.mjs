/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Developer Experience Verification
 * 📄 File: scripts/bootstrap-environment-policy.test.mjs
 *
 * 🎯 Purpose:
 * Prevents bootstrap from admitting an alternate effective database target.
 *
 * 🧠 Responsibilities:
 * • exercises allowed URLs, hostile overrides and credential-safe failures;
 * • verifies actual bootstrap ordering using virtual files and command stubs.
 *
 * 🏗️ Architecture:
 * Isolated policy/control-flow regressions; no child processes or connections.
 *
 * ⚠️ Important:
 * Never execute deploy, seed or Docker commands from these fixtures.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEnv } from "node:util";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { Client } from "pg";
import { assertLocalBootstrapEnvironment } from "./bootstrap-environment-policy.mjs";

const infrastructure = {
  POSTGRES_USER: "synthetic",
  POSTGRES_PASSWORD: "secret-not-for-logs",
  POSTGRES_DB: "synthetic",
  POSTGRES_PORT: "5433",
  REDIS_PORT: "6379",
};
const base =
  "postgresql://synthetic:secret-not-for-logs@localhost:5433/synthetic";
const environment = (DATABASE_URL) => ({ DATABASE_URL, REDIS_PORT: "6379" });

test("accepts existing generated URL and query-free local URLs without rewriting", () => {
  for (const url of [
    base,
    `${base}?schema=public`,
    base.replace("localhost", "127.0.0.1"),
    base.replace("postgresql:", "postgres:"),
  ]) {
    const env = environment(url);
    const before = structuredClone(env);
    assertLocalBootstrapEnvironment(env, infrastructure, "apps/api");
    assert.deepEqual(env, before);
  }
});

test("rejects target overrides, duplicate/encoded queries and fragments without secrets", () => {
  for (const query of [
    "?",
    "?host=synthetic.invalid",
    "?port=6543",
    "?user=other",
    "?password=other",
    "?database=other",
    "?dbname=other",
    "?schema=private",
    "?schema=public&host=synthetic.invalid",
    "?schema=public&schema=public",
    "?%73chema=public",
    "?schema=%70ublic",
    "?schema=public&",
    "?schema=public\n",
    "?sslmode=require",
    "?connection_limit=1",
    "#",
    "#fragment",
    "?schema=public#fragment",
  ]) {
    assert.throws(
      () =>
        assertLocalBootstrapEnvironment(
          environment(base + query),
          infrastructure,
          "apps/api",
        ),
      (error) => {
        assert.match(error.message, /no query or exactly \?schema=public/);
        assert.equal(
          error.message.includes(infrastructure.POSTGRES_PASSWORD),
          false,
        );
        assert.equal(error.message.includes("synthetic.invalid"), false);
        return true;
      },
    );
  }
});

test("preserves authority and Redis guards and safely rejects malformed inputs", () => {
  for (const url of [
    undefined,
    "invalid-secret-not-for-logs",
    base.replace("localhost", "remote.invalid"),
    base.replace(":5433", ":5434"),
    base.replace("/synthetic", "/other"),
    base.replace("synthetic:", "other:"),
    base.replace("secret-not-for-logs", "%ZZ"),
    base.replace("postgresql:", "https:"),
  ]) {
    assert.throws(
      () =>
        assertLocalBootstrapEnvironment(
          environment(url),
          infrastructure,
          "apps/worker",
        ),
      (error) => !error.message.includes("secret-not-for-logs"),
    );
  }
  for (const overrides of [
    { REDIS_HOST: "remote.invalid" },
    { REDIS_PORT: "6380" },
  ]) {
    assert.throws(() =>
      assertLocalBootstrapEnvironment(
        { ...environment(base), ...overrides },
        infrastructure,
        "apps/worker",
      ),
    );
  }
});

test("installed pg resolves overridden coordinates which bootstrap must reject", () => {
  for (const [query, expectedHost, expectedPort] of [
    ["?host=synthetic.invalid", "synthetic.invalid", 5433],
    ["?port=6543", "localhost", 6543],
  ]) {
    const parsed = new Client({ connectionString: base + query })
      .connectionParameters;
    assert.equal(parsed.host, expectedHost);
    assert.equal(Number(parsed.port), expectedPort);
    assert.throws(() =>
      assertLocalBootstrapEnvironment(
        environment(base + query),
        infrastructure,
        "apps/api",
      ),
    );
  }
});

const source = readFileSync(
  new URL("./bootstrap.mjs", import.meta.url),
  "utf8",
);
const manifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const virtualRoot = resolve(
  "node_modules/.cache/bootstrap-virtual-never-created",
);
const virtualScript = pathToFileURL(
  resolve(virtualRoot, "scripts/bootstrap.mjs"),
).href;
const executable = source
  .replace(/^import .+;\r?\n/gm, "")
  .replaceAll("import.meta.url", JSON.stringify(virtualScript));
assert.doesNotMatch(executable, /^import /m);

function runBootstrap({
  api = base,
  worker = base,
  local,
  inherited = {},
} = {}) {
  const files = new Map([
    [resolve(virtualRoot, "package.json"), JSON.stringify(manifest)],
    [
      resolve(virtualRoot, ".env"),
      Object.entries(infrastructure)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n"),
    ],
    ...[
      ["apps/api", api],
      ["apps/worker", worker],
      ["apps/web", base],
    ].map(([folder, url]) => [
      resolve(virtualRoot, folder, ".env"),
      `DATABASE_URL=${url}\nREDIS_PORT=6379\n`,
    ]),
  ]);
  if (local)
    files.set(
      resolve(virtualRoot, "apps/api/.env.local"),
      `DATABASE_URL=${local}\n`,
    );
  const calls = [];
  const messages = [];
  const processFixture = {
    platform: "linux",
    execPath: process.execPath,
    versions: { ...process.versions, node: manifest.engines.node },
    env: inherited,
    exitCode: 0,
  };
  runInNewContext(
    executable,
    {
      URL,
      resolve,
      dirname,
      fileURLToPath,
      parseEnv,
      assertLocalBootstrapEnvironment,
      process: processFixture,
      console: {
        log: (message) => messages.push(String(message)),
        error: (message) => messages.push(String(message)),
      },
      existsSync: (path) => files.has(path),
      readFileSync: (path) => {
        assert.ok(files.has(path), "unexpected virtual read");
        return files.get(path);
      },
      writeFileSync: () =>
        assert.fail("bootstrap must preserve existing files"),
      randomBytes: () =>
        assert.fail("bootstrap must preserve existing secrets"),
      spawnSync: (command, args) => {
        calls.push([command, ...args]);
        return {
          status: 0,
          stdout:
            command === "corepack" && args.at(-1) === "--version"
              ? manifest.engines.pnpm
              : "synthetic-daemon",
        };
      },
    },
    { timeout: 2000 },
  );
  return { calls, messages, exitCode: processFixture.exitCode };
}

test("actual bootstrap accepts generated config and preserves install/deploy/seed ordering", () => {
  const result = runBootstrap({ api: `${base}?schema=public`, worker: base });
  assert.equal(result.exitCode, 0);
  assert.deepEqual(
    result.calls.map((call) => call.join(" ")),
    [
      "corepack pnpm --version",
      "docker info --format {{.ServerVersion}}",
      "corepack pnpm install --frozen-lockfile",
      "docker compose up -d --wait --wait-timeout 600",
      "corepack pnpm db:generate",
      "corepack pnpm api:db:deploy",
      "corepack pnpm api:db:seed",
    ],
  );
});

test("actual bootstrap rejects API/Worker/local/process overrides before every mutating command", () => {
  const hostile = `${base}?host=synthetic.invalid`;
  for (const options of [
    { api: hostile },
    { worker: hostile },
    { local: hostile },
    { inherited: { DATABASE_URL: hostile } },
    { local: `${base}?schema=public&port=6543` },
    { api: hostile, local: `${base}?schema=public` },
  ]) {
    const result = runBootstrap(options);
    assert.equal(result.exitCode, 1);
    assert.deepEqual(
      result.calls.map((call) => call.join(" ")),
      ["corepack pnpm --version", "docker info --format {{.ServerVersion}}"],
    );
    assert.equal(
      result.messages.some(
        (message) =>
          message.includes("secret-not-for-logs") ||
          message.includes("synthetic.invalid"),
      ),
      false,
    );
  }
});
