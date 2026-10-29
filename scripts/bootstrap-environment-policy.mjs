/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Developer Experience
 * 📄 File: scripts/bootstrap-environment-policy.mjs
 *
 * 🎯 Purpose:
 * Proves bootstrap targets the declared local development infrastructure.
 *
 * 🧠 Responsibilities:
 * • validates database authority, exact query policy and Redis coordinates;
 * • reports configuration rejection without exposing supplied credentials.
 *
 * 🏗️ Architecture:
 * Pure bootstrap policy; no filesystem, network or process operations.
 *
 * ⚠️ Important:
 * Never normalize an unsafe target into an apparently safe configuration.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export function assertLocalBootstrapEnvironment(env, infrastructure, folder) {
  const message = `${folder}: database/Redis configuration must match local Compose; DATABASE_URL must have no query or exactly ?schema=public and no fragment before bootstrap can migrate or seed.`;
  try {
    const value = env.DATABASE_URL;
    if (typeof value !== "string") throw new Error();
    const database = new URL(value);
    if (
      !["postgresql:", "postgres:"].includes(database.protocol) ||
      !["localhost", "127.0.0.1"].includes(database.hostname) ||
      database.port !== infrastructure.POSTGRES_PORT ||
      decodeURIComponent(database.username) !== infrastructure.POSTGRES_USER ||
      decodeURIComponent(database.password) !==
        infrastructure.POSTGRES_PASSWORD ||
      decodeURIComponent(database.pathname.slice(1)) !==
        infrastructure.POSTGRES_DB ||
      value.includes("#") ||
      (value.includes("?") &&
        value.slice(value.indexOf("?")) !== "?schema=public") ||
      (env.REDIS_HOST ?? "localhost") !== "localhost" ||
      env.REDIS_PORT !== infrastructure.REDIS_PORT
    ) {
      throw new Error();
    }
  } catch {
    throw new Error(message);
  }
}
