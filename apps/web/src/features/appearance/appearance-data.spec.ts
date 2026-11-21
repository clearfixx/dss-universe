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

import { loadAdminShellVariant, loadShellVariant } from "./appearance-data";

describe("server-side platform appearance contract", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["MODULE_LAUNCHER", "HORIZONTAL_NAVIGATION", "HYBRID"] as const)(
    "resolves the live %s variant using an uncached request",
    async (variant) => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { platformAppearance: { activeShellVariant: variant } },
        }),
      } as Response);
      expect(await loadShellVariant()).toBe(variant);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/graphql",
        expect.objectContaining({ method: "POST", cache: "no-store" }),
      );
    },
  );

  it("falls back safely on malformed public responses and transport failures", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { platformAppearance: { activeShellVariant: "UNSUPPORTED" } },
      }),
    } as Response);
    expect(await loadShellVariant()).toBe("MODULE_LAUNCHER");
    mockFetch.mockRejectedValueOnce(new Error("network down"));
    expect(await loadShellVariant()).toBe("MODULE_LAUNCHER");
  });

  it("rejects unauthorized administrative responses without exposing a default", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ errors: [{ message: "Forbidden" }] }),
    } as Response);
    expect(await loadAdminShellVariant()).toBeNull();
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
});
