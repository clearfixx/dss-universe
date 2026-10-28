/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Development Infrastructure Verification
 * 📄 File: scripts/web-dev-port.test.mjs
 *
 * 🎯 Purpose:
 * Verifies isolated listener configuration before Next starts.
 *
 * 🧠 Responsibilities:
 * • checks explicit CLI/environment priority and optional file loading;
 * • rejects invalid ports and prevents unrelated dotenv preloading.
 *
 * 🏗️ Architecture:
 * Pure launcher contract tests with isolated temporary file fixtures.
 *
 * ⚠️ Important:
 * Never starts a server or changes host networking or application env files.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { devEnvironment } from "../apps/web/scripts/dev.mjs";
function fixture(run) {
  const directory = mkdtempSync(join(tmpdir(), "dss-dev-port-"));
  try {
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
test("missing optional file preserves standard Next defaults", () =>
  fixture((directory) => {
    assert.deepEqual(devEnvironment(directory, { PATH: "synthetic" }, []), {
      PATH: "synthetic",
    });
  }));
test("local file supplies only PORT without preloading other dotenv values", () =>
  fixture((directory) => {
    writeFileSync(
      join(directory, ".env.dev-port"),
      "PORT=3200\nOTHER_FIELD=synthetic\n",
    );
    assert.deepEqual(devEnvironment(directory, {}, []), { PORT: "3200" });
  }));
test("explicit environment and CLI keep priority over the local file", () =>
  fixture((directory) => {
    writeFileSync(join(directory, ".env.dev-port"), "PORT=invalid\n");
    assert.deepEqual(devEnvironment(directory, { PORT: "3300" }, []), {
      PORT: "3300",
    });
    for (const args of [["--port", "3195"], ["-p", "3195"], ["--port=3195"]])
      assert.deepEqual(devEnvironment(directory, {}, args), {});
  }));
test("invalid fixed ports fail before any Next child starts", () =>
  fixture((directory) => {
    for (const port of ["0", "65536", "-1", "NaN", "3200x"]) {
      writeFileSync(join(directory, ".env.dev-port"), `PORT=${port}\n`);
      assert.throws(() => devEnvironment(directory, {}, []), /Invalid PORT/);
    }
  }));
