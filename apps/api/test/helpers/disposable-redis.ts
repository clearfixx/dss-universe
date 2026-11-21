/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: API E2E
 * 📄 File: apps/api/test/helpers/disposable-redis.ts
 *
 * 🎯 Purpose:
 * Resolves the disposable loopback test Redis port from an explicit allowlist.
 *
 * ⚠️ Important:
 * Mirrors the disposable PostgreSQL port allowlist so parallel agents can use
 * separate instances; any other port fails closed.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const DISPOSABLE_REDIS_PORTS: readonly number[] = [6380, 6381];

export function isDisposableRedisPort(port: unknown): boolean {
  return DISPOSABLE_REDIS_PORTS.includes(Number(port));
}

export function disposableRedisPort(): number {
  const port = Number(process.env.REDIS_PORT ?? 6380);
  if (!isDisposableRedisPort(port)) {
    throw new Error(
      `Expected disposable loopback Redis on port ${DISPOSABLE_REDIS_PORTS.join('/')}.`,
    );
  }
  return port;
}
