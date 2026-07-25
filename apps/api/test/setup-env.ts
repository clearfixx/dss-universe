/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: API Test Infrastructure
 * 📄 File: apps/api/test/setup-env.ts
 *
 * 🎯 Purpose:
 * Provides deterministic, non-production environment defaults for API e2e tests.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??=
  'postgresql://dss_test:dss_test@127.0.0.1:5433/dss_test';
process.env.JWT_ACCESS_SECRET ??= 'dss-test-access-secret-not-for-production';
process.env.JWT_REFRESH_SECRET ??= 'dss-test-refresh-secret-not-for-production';
process.env.MEDIA_SIGNING_SECRET ??=
  'dss-test-media-signing-secret-not-for-production';
process.env.OUTBOX_DISPATCH_INTERVAL_MS ??= '0';
process.env.MEDIA_CLEANUP_INTERVAL_MS ??= '0';
process.env.REDIS_HOST ??= '127.0.0.1';
process.env.REDIS_PORT ??= '6380';
