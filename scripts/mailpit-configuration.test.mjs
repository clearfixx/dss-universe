/**
 * DSS Universe — Local Mail Infrastructure Verification
 * File: scripts/mailpit-configuration.test.mjs
 * Purpose: Verify effective Compose storage, loopback mappings and host consumers.
 * Ownership: configuration regression only; no container or database mutations.
 * Invariants: synthetic interpolation values; never print resolved configuration.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

test("effective Mailpit Compose uses persistent storage and loopback host ports", () => {
  const result = spawnSync(
    "docker",
    [
      "compose",
      "--env-file",
      ".env.example",
      "-f",
      "docker-compose.yml",
      "config",
      "--format",
      "json",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        POSTGRES_USER: "synthetic",
        POSTGRES_PASSWORD: "synthetic",
        POSTGRES_DB: "synthetic",
        POSTGRES_PORT: "5433",
        REDIS_PORT: "6379",
      },
    },
  );
  assert.equal(result.status, 0, "Docker Compose configuration must resolve");
  const config = JSON.parse(result.stdout);
  const mail = config.services.mailpit;
  assert.equal(mail.image, "axllent/mailpit:v1.31.2");
  assert.equal(mail.environment.MP_DATABASE, "/data/mailpit.db");
  assert.deepEqual(
    mail.ports.map(({ host_ip, published, target }) => ({
      host_ip,
      published: String(published),
      target,
    })),
    [
      { host_ip: "127.0.0.1", published: "2525", target: 1025 },
      { host_ip: "127.0.0.1", published: "18025", target: 8025 },
    ],
  );
  assert.equal(mail.volumes.length, 1);
  assert.equal(mail.volumes[0].type, "volume");
  assert.equal(mail.volumes[0].source, "dss_mailpit_data");
  assert.equal(mail.volumes[0].target, "/data");
  assert.ok(config.volumes.dss_mailpit_data);
  assert.deepEqual(mail.healthcheck.test, ["CMD", "/mailpit", "readyz"]);
});

test("API and Worker host examples agree on SMTP2525 without external relay", () => {
  for (const app of ["api", "worker"]) {
    const example = readFileSync(
      new URL(`../apps/${app}/.env.example`, import.meta.url),
      "utf8",
    );
    assert.match(example, /^MAIL_HOST="?localhost"?\r?$/m);
    assert.match(example, /^MAIL_PORT=2525\r?$/m);
  }
  const compose = readFileSync(
    new URL("../docker-compose.yml", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    compose,
    /MP_SMTP_(?:RELAY|FORWARD)|--smtp-relay|--smtp-forward/,
  );
});
