import { describe, expect, it } from "vitest";

import {
  isAccessTokenFresh,
  isGuestOnlyPath,
  isProtectedPath,
  safeReturnTo,
} from "./session-contract";

function token(exp: number) {
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `header.${payload}.signature`;
}

describe("session routing contract", () => {
  it("protects private workspaces without hiding public news", () => {
    expect(isProtectedPath("/command-deck")).toBe(true);
    expect(isProtectedPath("/settings/profile")).toBe(true);
    expect(isProtectedPath("/newsroom/new")).toBe(true);
    expect(isProtectedPath("/news/some-article")).toBe(false);
  });

  it("keeps password recovery available to signed-in users", () => {
    expect(isGuestOnlyPath("/login")).toBe(true);
    expect(isGuestOnlyPath("/register")).toBe(true);
    expect(isGuestOnlyPath("/forgot-password")).toBe(false);
    expect(isGuestOnlyPath("/reset-password")).toBe(false);
  });

  it("accepts only local return destinations", () => {
    expect(safeReturnTo("/newsroom/new?draft=1")).toBe("/newsroom/new?draft=1");
    expect(safeReturnTo("https://attacker.example/phish")).toBe("/");
    expect(safeReturnTo("//attacker.example/phish")).toBe("/");
    expect(safeReturnTo("/login?returnTo=/command-deck")).toBe("/");
  });

  it("recognizes fresh, expired and malformed access tokens", () => {
    const now = 2_000_000_000_000;
    expect(isAccessTokenFresh(token(now / 1_000 + 60), now)).toBe(true);
    expect(isAccessTokenFresh(token(now / 1_000 - 1), now)).toBe(false);
    expect(isAccessTokenFresh("not-a-jwt", now)).toBe(false);
  });
});
