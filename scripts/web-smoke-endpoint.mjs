/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Test Infrastructure
 * 📄 File: scripts/web-smoke-endpoint.mjs
 *
 * 🎯 Purpose:
 * Resolves one explicit loopback endpoint for the gate and browser tests.
 *
 * 🧠 Responsibilities:
 * • preserves the default test port;
 * • rejects ambiguous overrides without echoing their values.
 *
 * 🏗️ Architecture:
 * Pure test configuration; no server startup or application dependency.
 *
 * ⚠️ Important:
 * Never selects a fallback port or accepts an alternate host.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

/** @param {Record<string, string | undefined>} source */
export function resolveWebSmokeEndpoint(source = process.env) {
  const raw = source.DSS_WEB_TEST_PORT;
  const port = raw === undefined ? 3100 : Number(raw);
  if (
    raw !== undefined &&
    (typeof raw !== "string" ||
      !/^[1-9]\d{3,4}$/.test(raw) ||
      !Number.isInteger(port) ||
      port < 1024 ||
      port > 65535)
  ) {
    throw new Error(
      "DSS_WEB_TEST_PORT must be a decimal TCP port from 1024 to 65535.",
    );
  }
  return { hostname: "127.0.0.1", port, baseURL: `http://127.0.0.1:${port}` };
}
