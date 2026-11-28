import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const api = fileURLToPath(new URL("../apps/api/", import.meta.url));

test("Nest CLI launches the canonical entry and restarts after a source edit", { timeout: 120_000 }, async () => {
  // Isolated source tree: real installed CLI/compiler, no application credentials,
  // database connections or changes to the developer's working tree.
  const fixture = mkdtempSync(join(tmpdir(), "dss-api-watch-"));
  let child;
  let output = "";
  let spawnError;
  const windows = process.platform === "win32";
  try {
    for (const file of ["nest-cli.json", "tsconfig.json", "tsconfig.build.json"]) {
      copyFileSync(join(api, file), join(fixture, file));
    }
    writeFileSync(join(fixture, "package.json"), JSON.stringify({ name: "dss-watch-fixture", private: true }));
    symlinkSync(join(api, "node_modules"), join(fixture, "node_modules"), windows ? "junction" : "dir");
    mkdirSync(join(fixture, "src"));
    const entry = join(fixture, "src", "main.ts");
    const writeEntry = (revision) => writeFileSync(entry, `console.log("DSS_WATCH_READY:${revision}"); setInterval(() => {}, 1000);\n`);
    writeEntry(1);
    const require = createRequire(join(api, "package.json"));
    const cli = require.resolve("@nestjs/cli/bin/nest.js");
    child = spawn(process.execPath, [cli, "start", "--watch"], {
      cwd: fixture,
      detached: !windows,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP, HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, CI: "1" },
    });
    child.on("error", (error) => { spawnError = error; });
    for (const stream of [child.stdout, child.stderr]) {
      stream.on("data", (chunk) => { output += chunk.toString(); });
    }
    async function waitFor(marker) {
      const deadline = Date.now() + 45_000;
      while (!output.includes(marker)) {
        assert.ifError(spawnError);
        assert.equal(child.exitCode, null, output);
        assert.doesNotMatch(output, /Cannot find module.*dist[\\/].*main/i);
        assert.ok(Date.now() < deadline, `Missing ${marker}\n${output}`);
        await delay(100);
      }
    }
    await waitFor("DSS_WATCH_READY:1");
    await delay(500);
    writeEntry(2);
    await waitFor("DSS_WATCH_READY:2");
    assert.doesNotMatch(output, /Cannot find module.*dist[\\/].*main/i);
  } finally {
    if (child?.pid && child.exitCode === null && child.signalCode === null) {
      const closed = once(child, "close");
      if (windows) {
        spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
      } else {
        try { process.kill(-child.pid, "SIGKILL"); } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
      }
      await closed;
    }
    rmSync(fixture, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});
