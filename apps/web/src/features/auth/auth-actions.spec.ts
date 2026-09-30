import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieDelete: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`REDIRECT:${destination}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    delete: mocks.cookieDelete,
    get: mocks.cookieGet,
    set: mocks.cookieSet,
  })),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { initialAuthFormState } from "./auth-contracts";
import { loginAction, logoutAction } from "./auth-actions";

describe("session server actions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.cookieDelete.mockReset();
    mocks.cookieGet.mockReset();
    mocks.cookieSet.mockReset();
    mocks.redirect.mockClear();
  });

  it("stores a persistent marker only when remember-me is selected", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        data: {
          login: {
            user: { id: "user-1" },
            tokens: { accessToken: "access", refreshToken: "refresh" },
          },
        },
      }),
    );
    const form = new FormData();
    form.set("email", "dev@dss.test");
    form.set("password", "strong-pass");
    form.set("remember", "on");
    form.set("returnTo", "/newsroom/new?draft=1");

    await expect(loginAction(initialAuthFormState, form)).rejects.toThrow(
      "REDIRECT:/newsroom/new?draft=1",
    );
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "dss_session_persistent",
      "1",
      expect.objectContaining({ httpOnly: true, maxAge: 604_800 }),
    );
  });

  it("rejects an external post-login destination", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        data: {
          login: {
            user: { id: "user-1" },
            tokens: { accessToken: "access", refreshToken: "refresh" },
          },
        },
      }),
    );
    const form = new FormData();
    form.set("email", "dev@dss.test");
    form.set("password", "strong-pass");
    form.set("returnTo", "https://attacker.example/phish");

    await expect(loginAction(initialAuthFormState, form)).rejects.toThrow(
      "REDIRECT:/",
    );
  });

  it("revokes the API session, clears every cookie and returns to login", async () => {
    mocks.cookieGet.mockReturnValue({ value: "access" });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        Response.json({ data: { logout: { success: true } } }),
      );

    await expect(logoutAction()).rejects.toThrow("REDIRECT:/login?loggedOut=1");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer access" }),
      }),
    );
    expect(mocks.cookieDelete.mock.calls.map(([name]) => name)).toEqual([
      "dss_access_token",
      "dss_refresh_token",
      "dss_session_persistent",
    ]);
  });
});
