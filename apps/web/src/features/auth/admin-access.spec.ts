import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("react", async (importOriginal) => {
  const original = await importOriginal<typeof import("react")>();
  return {
    ...original,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  };
});
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (key: string) =>
      key === "dss_access_token" ? { value: "test-token" } : undefined,
  })),
}));
vi.mock("@/config/site.config", () => ({
  siteConfig: { graphqlUrl: "http://localhost:4000/graphql" },
}));

import { cookies } from "next/headers";

import { loadAdminCommandDeckAccess } from "./admin-access";

describe("server-side Command Deck authorization", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("denies guests without contacting the IAM service", async () => {
    vi.mocked(cookies).mockResolvedValueOnce({
      get: () => undefined,
    } as Awaited<ReturnType<typeof cookies>>);
    expect(await loadAdminCommandDeckAccess()).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("grants access only to an explicit successful IAM response", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { adminCommandDeckAccess: true } }),
    } as Response);
    expect(await loadAdminCommandDeckAccess()).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:4000/graphql",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }) as Record<string, string>,
      }),
    );
  });

  it.each([
    { errors: [{ message: "Forbidden" }] },
    { data: { adminCommandDeckAccess: false } },
    { data: { adminCommandDeckAccess: "true" } },
    { data: {} },
  ])("denies ambiguous or unauthorized API replies", async (payload) => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as Response);
    expect(await loadAdminCommandDeckAccess()).toBe(false);
  });

  it("denies access when the IAM API is unavailable", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("API unavailable"));
    expect(await loadAdminCommandDeckAccess()).toBe(false);
  });

  it("denies access on an unsuccessful HTTP status", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    expect(await loadAdminCommandDeckAccess()).toBe(false);
  });
});
