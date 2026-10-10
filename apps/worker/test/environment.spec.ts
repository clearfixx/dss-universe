/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Worker Configuration
 * 📄 File: apps/worker/test/environment.spec.ts
 *
 * 🎯 Purpose:
 * Verifies configuration fails before workers can use implicit endpoints.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { describe, expect, it } from "vitest";
import { validateWorkerEnvironment } from "../src/environment.js";

const database = { DATABASE_URL: "postgresql://localhost/dss_test" };
describe("worker environment", () => {
  it("rejects a missing or non-PostgreSQL database URL", () => {
    for (const DATABASE_URL of [undefined, "", "https://localhost/db"]) {
      expect(() => validateWorkerEnvironment({ DATABASE_URL })).toThrow(
        "DATABASE_URL",
      );
    }
  });
  it("rejects invalid endpoint ports", () => {
    for (const REDIS_PORT of ["", "0", "65536", "1.2", "oops"]) {
      expect(() =>
        validateWorkerEnvironment({ ...database, REDIS_PORT }),
      ).toThrow("REDIS_PORT");
    }
  });
  it("allows explicitly disabled mail", () => {
    expect(() => validateWorkerEnvironment(database)).not.toThrow();
  });
  it("requires complete mail configuration when enabled", () => {
    expect(() =>
      validateWorkerEnvironment({ ...database, MAIL_HOST: "localhost" }),
    ).toThrow("MAIL_FROM");
  });
  it("accepts local mail and rejects insecure production links", () => {
    const env = {
      ...database,
      MAIL_HOST: "localhost",
      MAIL_FROM: "dev@dss.local",
      PASSWORD_RESET_WEB_URL: "http://localhost:3000/reset-password",
      EMAIL_VERIFICATION_WEB_URL: "http://localhost:3000/verify-email",
    };
    expect(() => validateWorkerEnvironment(env)).not.toThrow();
    expect(() =>
      validateWorkerEnvironment({ ...env, NODE_ENV: "production" }),
    ).toThrow("HTTPS");
  });
});
