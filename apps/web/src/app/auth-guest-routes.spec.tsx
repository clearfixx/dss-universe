import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  viewer: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/features/auth/session-data", () => ({
  loadSessionViewer: mocks.viewer,
}));
vi.mock("@/features/auth", () => ({
  AuthGateway: ({ mode, returnTo }: { mode: string; returnTo: string }) =>
    createElement("div", { "data-mode": mode, "data-return-to": returnTo }),
}));

import LoginPage from "./login/page";
import RegisterPage from "./register/page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("guest-only authentication routes", () => {
  it("keeps login available for a rejected or revoked session", async () => {
    mocks.viewer.mockResolvedValue(null);
    const html = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({ returnTo: "/newsroom/new" }),
      }),
    );
    expect(html).toContain('data-mode="login"');
    expect(html).toContain('data-return-to="/newsroom/new"');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects a backend-validated viewer to a sanitized internal destination", async () => {
    mocks.viewer.mockResolvedValue({ id: "1", username: "author" });
    await expect(
      LoginPage({
        searchParams: Promise.resolve({
          returnTo: "//evil.example/phish",
        }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("keeps registration accessible when identity is not verified", async () => {
    mocks.viewer.mockResolvedValue(null);
    const html = renderToStaticMarkup(
      await RegisterPage({
        searchParams: Promise.resolve({ returnTo: "/news" }),
      }),
    );
    expect(html).toContain('data-mode="register"');
    expect(html).toContain('data-return-to="/news"');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects registered, validated viewers without an extra login form", async () => {
    mocks.viewer.mockResolvedValue({ id: "2", username: "member" });
    await expect(
      RegisterPage({
        searchParams: Promise.resolve({ returnTo: "/settings/profile" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT:/settings/profile");
    expect(mocks.redirect).toHaveBeenCalledWith("/settings/profile");
  });
});
