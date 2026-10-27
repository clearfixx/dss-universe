/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Test Infrastructure Verification
 * 📄 File: scripts/web-smoke-endpoint.test.mjs
 *
 * 🎯 Purpose:
 * Proves endpoint agreement, strict forwarding and fail-closed preflight.
 *
 * 🧠 Responsibilities:
 * • checks pure validation and actual loaded Playwright configuration;
 * • exercises socket failures and actual Turbo dependency/env metadata.
 *
 * 🏗️ Architecture:
 * Test-only controls; configuration imports never start a browser or server.
 *
 * ⚠️ Important:
 * No fixed-port listener, DB, sleep, retry or environment-value logging.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { resolveWebSmokeEndpoint } from "./web-smoke-endpoint.mjs";
import { assertWebSmokePortFree } from "./web-smoke-preflight.mjs";
import { createBrowserEnvironment } from "./full-quality-policy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

test("endpoint keeps default and canonical loopback overrides", () => {
  assert.deepEqual(resolveWebSmokeEndpoint({}), {
    hostname: "127.0.0.1",
    port: 3100,
    baseURL: "http://127.0.0.1:3100",
  });
  for (const port of ["1024", "3195", "65535"])
    assert.equal(
      resolveWebSmokeEndpoint({ DSS_WEB_TEST_PORT: port }).baseURL,
      `http://127.0.0.1:${port}`,
    );
});

test("endpoint rejects malformed overrides without echoing their values", () => {
  for (const value of [
    "",
    "0",
    "80",
    "1023",
    "65536",
    "99999",
    "03100",
    "3195x",
    " 3195",
    "3195 ",
    "3.195e3",
    "-3195",
    "http://remote:3195",
    "synthetic-secret-value",
    3195,
    null,
  ]) {
    assert.throws(() => resolveWebSmokeEndpoint({ DSS_WEB_TEST_PORT: value }), {
      message:
        "DSS_WEB_TEST_PORT must be a decimal TCP port from 1024 to 65535.",
    });
  }
});

function fakeServer(bindError, closeError) {
  const server = new EventEmitter();
  server.listen = (port, hostname, ready) => {
    server.bound = { port, hostname };
    queueMicrotask(() =>
      bindError ? server.emit("error", bindError) : ready(),
    );
  };
  server.close = (closed) => {
    server.released = true;
    queueMicrotask(() => closed(closeError));
  };
  return server;
}

test("preflight awaits readiness and successful socket release", async () => {
  const server = fakeServer();
  await assertWebSmokePortFree(
    resolveWebSmokeEndpoint({ DSS_WEB_TEST_PORT: "3195" }),
    () => server,
  );
  assert.deepEqual(server.bound, { port: 3195, hostname: "127.0.0.1" });
  assert.equal(server.released, true);
});

for (const code of ["EACCES", "EADDRINUSE", undefined]) {
  test(`preflight preserves bind failure ${code ?? "UNKNOWN"} without fallback`, async () => {
    const cause = Object.assign(new Error("Synthetic bind failure"), { code });
    const server = fakeServer(cause);
    await assert.rejects(
      assertWebSmokePortFree(resolveWebSmokeEndpoint({}), () => server),
      (error) =>
        error.cause === cause && error.message.includes(code ?? "UNKNOWN"),
    );
    assert.equal(server.released, undefined);
  });
}

test("preflight propagates a close failure instead of claiming a free endpoint", async () => {
  const cause = new Error("Synthetic close failure");
  await assert.rejects(
    assertWebSmokePortFree(resolveWebSmokeEndpoint({}), () =>
      fakeServer(undefined, cause),
    ),
    (error) => error === cause,
  );
});

test("preflight rejects a real occupied socket without stopping its owner", async () => {
  const owner = createServer();
  await new Promise((resolve, reject) => {
    owner.once("error", reject);
    owner.listen(0, "127.0.0.1", resolve);
  });
  try {
    const port = owner.address().port;
    await assert.rejects(
      assertWebSmokePortFree({ hostname: "127.0.0.1", port }),
      /EADDRINUSE/,
    );
    assert.equal(owner.listening, true);
  } finally {
    await new Promise((resolve, reject) =>
      owner.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("browser environment forwards only a validated canonical test port", () => {
  const env = createBrowserEnvironment({
    DSS_WEB_TEST_PORT: "3195",
    JWT_ACCESS_SECRET: "synthetic",
    DATABASE_URL: "synthetic",
  });
  assert.equal(env.DSS_WEB_TEST_PORT, "3195");
  assert.equal(env.JWT_ACCESS_SECRET, undefined);
  assert.equal(env.DATABASE_URL, undefined);
  assert.throws(() => createBrowserEnvironment({ DSS_WEB_TEST_PORT: "bad" }));
});

test("actual gate refuses an occupied override before any quality command", async () => {
  const owner = createServer();
  await new Promise((resolve, reject) => {
    owner.once("error", reject);
    owner.listen(0, "127.0.0.1", resolve);
  });
  try {
    const port = String(owner.address().port);
    const neverRun = fileURLToPath(
      new URL(
        "../node_modules/.cache/debt087-never-run-cli.cjs",
        import.meta.url,
      ),
    );
    assert.equal(existsSync(neverRun), false);
    const child = spawnSync(
      process.execPath,
      ["scripts/run-full-quality.mjs"],
      {
        cwd: root,
        env: {
          ...createBrowserEnvironment(process.env),
          DSS_WEB_TEST_PORT: port,
          DATABASE_URL:
            "postgresql://dss_test:synthetic@127.0.0.1:5434/dss_test",
          npm_execpath: neverRun,
        },
        encoding: "utf8",
        windowsHide: true,
      },
    );
    assert.equal(child.error, undefined);
    assert.equal(child.status, 1);
    assert.match(child.stderr, /EADDRINUSE/);
    assert.ok(child.stderr.includes(`port ${port}`));
    assert.doesNotMatch(child.stdout, /format:check/);
    assert.equal(owner.listening, true);
  } finally {
    await new Promise((resolve, reject) =>
      owner.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

for (const port of [undefined, "3195"]) {
  test(`actual Playwright endpoint configuration: ${port ?? "default"}`, () => {
    const env = createBrowserEnvironment(process.env);
    if (port === undefined) delete env.DSS_WEB_TEST_PORT;
    else env.DSS_WEB_TEST_PORT = port;
    const child = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "const m=await import('./apps/web/playwright.config.ts'); console.log(JSON.stringify({use:m.default.use,server:m.default.webServer,retries:m.default.retries,forbidOnly:m.default.forbidOnly}));",
      ],
      { cwd: root, env, encoding: "utf8", windowsHide: true },
    );
    assert.equal(child.status, 0, child.stderr);
    const config = JSON.parse(child.stdout);
    const expected = resolveWebSmokeEndpoint(
      port ? { DSS_WEB_TEST_PORT: port } : {},
    );
    assert.equal(config.use.baseURL, expected.baseURL);
    assert.equal(config.server.url, expected.baseURL);
    assert.equal(
      config.server.command,
      `pnpm dev --hostname 127.0.0.1 --port ${expected.port}`,
    );
    assert.equal(config.server.reuseExistingServer, false);
    assert.equal(config.server.timeout, 120000);
    assert.equal(config.retries, 0);
    assert.equal(config.forbidOnly, true);
  });
}

test("actual Turbo Web E2E hash covers the override and external helper inputs", () => {
  assert.ok(
    process.env.npm_execpath,
    "Invoke through pnpm test:quality-policy",
  );
  const dry = (task, port) => {
    const child = spawnSync(
      process.execPath,
      [
        process.env.npm_execpath,
        "exec",
        "turbo",
        "run",
        task,
        "--filter=@dss/web",
        "--dry=json",
        "--env-mode=strict",
      ],
      {
        cwd: root,
        env: { ...process.env, DSS_WEB_TEST_PORT: port },
        encoding: "utf8",
        windowsHide: true,
      },
    );
    assert.equal(child.status, 0, child.stderr);
    return JSON.parse(child.stdout).tasks.find(
      (value) => value.taskId === `@dss/web#${task}`,
    );
  };
  const first = dry("test:e2e", "3195");
  assert.equal(first.envMode, "strict");
  assert.equal(first.resolvedTaskDefinition.cache, false);
  assert.ok(first.dependencies.includes("@dss/web#build"));
  assert.ok(first.resolvedTaskDefinition.env.includes("DSS_WEB_TEST_PORT"));
  for (const key of [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "RUN_AUTH_DB_TESTS",
  ]) {
    assert.ok(!first.resolvedTaskDefinition.env.includes(key));
    assert.ok(
      !(first.resolvedTaskDefinition.passThroughEnv ?? []).includes(key),
    );
  }
  assert.notEqual(dry("test:e2e", "3196").hash, first.hash);
  for (const task of ["build", "lint", "typecheck"])
    assert.ok(
      Object.keys(dry(task, "3195").inputs).some((key) =>
        key.endsWith("scripts/web-smoke-endpoint.mjs"),
      ),
      task,
    );
});
