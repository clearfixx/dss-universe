import { describe, expect, it } from "vitest";

import { loginSchema, recoverySchema, registerSchema } from "./auth-contracts";

describe("auth form contracts", () => {
  it("accepts a valid login and normalizes its email", () => {
    const result = loginSchema.parse({
      email: "  DEV@example.com ",
      password: "strong-pass",
    });
    expect(result.email).toBe("DEV@example.com");
    expect(result.twoFactorCode).toBeUndefined();
  });

  it("accepts authenticator and recovery codes but rejects malformed values", () => {
    const base = { email: "dev@example.com", password: "strong-pass" };
    expect(
      loginSchema.safeParse({ ...base, twoFactorCode: "123456" }).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({ ...base, twoFactorCode: "ABCDEF-123456" })
        .success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({ ...base, twoFactorCode: "12345" }).success,
    ).toBe(false);
  });

  it("rejects registration when confirmation differs", () => {
    const result = registerSchema.safeParse({
      displayName: "Alex Frost",
      username: "alex_frost",
      email: "alex@example.com",
      password: "strong-pass",
      confirmPassword: "another-pass",
      terms: "on",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        "Passwords do not match.",
      );
    }
  });

  it("requires consent before account creation", () => {
    const result = registerSchema.safeParse({
      displayName: "Alex Frost",
      username: "alex_frost",
      email: "alex@example.com",
      password: "strong-pass",
      confirmPassword: "strong-pass",
    });
    expect(result.success).toBe(false);
  });

  it("validates the recovery address without claiming delivery", () => {
    expect(recoverySchema.safeParse({ email: "not-an-email" }).success).toBe(
      false,
    );
  });
});
