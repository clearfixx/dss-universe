/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage Native P1
 * 📄 File: packages/storage/native-probe/build.mjs
 *
 * 🎯 Purpose:
 * Builds the opt-in prototype against the pinned Node toolchain.
 *
 * 🧠 Responsibilities:
 * • Checks the supported runtime/platform before invoking the compiler.
 * • Runs local node-gyp with structured arguments and propagates build failure.
 *
 * 🏗️ Architecture:
 * Development-only orchestration, never loaded by API or Worker.
 *
 * ⚠️ Important:
 * No automatic compiler installation or permissive platform fallback.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const expected = readFileSync(
  new URL("../../../.node-version", import.meta.url),
  "utf8",
).trim();
if (
  process.versions.node !== expected ||
  !["win32", "linux", "darwin"].includes(process.platform)
) {
  throw new Error(
    "Storage native P1 requires the pinned Node version on Windows/Linux/macOS.",
  );
}
const gyp = fileURLToPath(
  new URL("../node_modules/node-gyp/bin/node-gyp.js", import.meta.url),
);
const directory = fileURLToPath(new URL(".", import.meta.url));
const args = [gyp, "rebuild", "--directory", directory, `--target=${expected}`];
if (process.env.PYTHON) args.push("--python", process.env.PYTHON);
const result = spawnSync(process.execPath, args, {
  stdio: "inherit",
  shell: false,
  windowsHide: true,
});
if (result.error) throw result.error;
if (result.status !== 0)
  throw new Error(
    `Storage native P1 build failed (${result.status ?? result.signal}).`,
  );
