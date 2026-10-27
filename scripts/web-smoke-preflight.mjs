/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Test Infrastructure
 * 📄 File: scripts/web-smoke-preflight.mjs
 *
 * 🎯 Purpose:
 * Fails before smoke execution when its resolved endpoint cannot be bound.
 *
 * 🧠 Responsibilities:
 * • verifies bind and successful socket release;
 * • preserves the actual bind failure as the error cause.
 *
 * 🏗️ Architecture:
 * Node-only test preflight, separate from pure endpoint configuration.
 *
 * ⚠️ Important:
 * Never stops or reuses an existing service and never retries another port.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createServer } from "node:net";

export async function assertWebSmokePortFree(
  { hostname, port },
  makeServer = createServer,
) {
  await new Promise((resolve, reject) => {
    const server = makeServer();
    server.once("error", (cause) => {
      const code = typeof cause.code === "string" ? cause.code : "UNKNOWN";
      reject(
        new Error(
          `Web smoke requires available loopback port ${port} (${code}); existing servers are never reused or stopped.`,
          { cause },
        ),
      );
    });
    server.listen(port, hostname, () =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
}

// ☕ A reserved port is a detour, not permission to evict another service.
