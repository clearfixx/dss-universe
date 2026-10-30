/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Storage Verification
 * 📄 File: packages/storage/vitest.config.mjs
 *
 * 🎯 Purpose:
 * Keeps Vitest discovery separate from the mandatory native Node test runner.
 *
 * 🧠 Responsibilities:
 * • preserves Vitest defaults and existing portable-key coverage;
 * • excludes only the native suite already required by native:verify.
 *
 * 🏗️ Architecture:
 * Test-runner configuration; no application or physical-storage policy.
 *
 * ⚠️ Important:
 * Never remove native:verify from the full gate or skip its native CI matrix.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "native-probe/probe.test.cjs"],
  },
});
