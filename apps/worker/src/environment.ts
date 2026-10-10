/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Worker Configuration
 * 📄 File: apps/worker/src/environment.ts
 *
 * 🎯 Purpose:
 * Rejects incomplete worker configuration before consumers connect.
 *
 * 🧠 Responsibilities:
 * • validates the required database endpoint;
 * • validates ports and complete mail delivery configuration.
 *
 * 🏗️ Architecture:
 * Startup configuration boundary; never logs configuration values.
 *
 * ⚠️ Important:
 * Undefined database configuration must never select PostgreSQL defaults.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export function validateWorkerEnvironment(env: NodeJS.ProcessEnv): void {
  let database: URL;
  try {
    database = new URL(env.DATABASE_URL ?? "");
  } catch {
    throw new Error("DATABASE_URL must be a PostgreSQL URL.");
  }
  if (!["postgres:", "postgresql:"].includes(database.protocol))
    throw new Error("DATABASE_URL must be a PostgreSQL URL.");
  for (const key of ["REDIS_PORT", "MAIL_PORT", "CLAMAV_PORT"]) {
    if (env[key] === undefined) continue;
    const value = Number(env[key]);
    if (!Number.isInteger(value) || value < 1 || value > 65535)
      throw new Error(`${key} must be an integer port between 1 and 65535.`);
  }
  if (env.MAIL_HOST) {
    for (const key of [
      "MAIL_FROM",
      "PASSWORD_RESET_WEB_URL",
      "EMAIL_VERIFICATION_WEB_URL",
    ]) {
      if (!env[key])
        throw new Error(`${key} is required when MAIL_HOST is configured.`);
    }
    for (const key of [
      "PASSWORD_RESET_WEB_URL",
      "EMAIL_VERIFICATION_WEB_URL",
    ]) {
      let url: URL;
      try {
        url = new URL(env[key]!);
      } catch {
        throw new Error(`${key} must be an HTTP URL.`);
      }
      if (!["http:", "https:"].includes(url.protocol))
        throw new Error(`${key} must be an HTTP URL.`);
      if (env.NODE_ENV === "production" && url.protocol !== "https:")
        throw new Error(`${key} must use HTTPS in production.`);
    }
  }
}
