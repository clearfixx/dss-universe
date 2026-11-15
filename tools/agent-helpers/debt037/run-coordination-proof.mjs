/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Storage Coordination Characterization
 * 📄 File: tools/agent-helpers/debt037/run-coordination-proof.mjs
 *
 * 🎯 Purpose:
 * Runs OS coordination proofs using the preceding native build's interpreter.
 *
 * 🧠 Responsibilities:
 * • reads generated node-gyp toolchain metadata without a second resolver;
 * • executes maintained proof source with structured arguments;
 * • propagates missing configuration or failed assertions without fallback.
 *
 * 🏗️ Architecture:
 * Verification orchestration only; never loaded by API or Worker.
 *
 * ⚠️ Important:
 * Requires native:build first; never installs Python or executes archived helpers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

if (process.argv.length !== 2)
  throw new Error("Storage coordination proof accepts no arguments.");
let configuration;
try {
  configuration = JSON.parse(
    readFileSync(
      new URL(
        "../../../packages/storage/native-probe/build/config.gypi",
        import.meta.url,
      ),
      "utf8",
    ).replace(/^#.*$/gm, ""),
  );
} catch (error) {
  if (error.code === "ENOENT")
    throw new Error(
      "Run storage native:build before coordination verification.",
      {
        cause: error,
      },
    );
  throw error;
}
const python = configuration.variables?.python;
if (typeof python !== "string" || !isAbsolute(python))
  throw new Error(
    "Run storage native:build to select an absolute Python executable.",
  );
const result = spawnSync(
  python,
  [fileURLToPath(new URL("coordination-proof.py", import.meta.url))],
  {
    stdio: "inherit",
    shell: false,
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: "1",
      PYTHONUNBUFFERED: "1",
    },
  },
);
if (result.error) throw result.error;
if (result.status !== 0)
  throw new Error(
    `Storage coordination proof failed (${result.status ?? result.signal}).`,
  );
