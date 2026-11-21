import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  viewer: vi.fn(),
  variant: vi.fn(),
  admin: vi.fn(),
}));

vi.mock("@/features/auth/session-data", () => ({
  loadSessionViewer: mocks.viewer,
}));
vi.mock("@/features/appearance/appearance-data", () => ({
  loadShellVariant: mocks.variant,
}));
vi.mock("@/features/auth/admin-access", () => ({
  loadAdminCommandDeckAccess: mocks.admin,
}));
vi.mock("./dss-application-shell", () => ({
  DssApplicationShell: ({
    children,
    viewer,
    variant,
    canAccessAdminDeck,
  }: {
    children: React.ReactNode;
    viewer: { username: string } | null;
    variant: string;
    canAccessAdminDeck: boolean;
  }) =>
    createElement(
      "section",
      {
        "data-viewer": viewer?.username ?? "guest",
        "data-variant": variant,
        "data-admin": String(canAccessAdminDeck),
      },
      children,
    ),
}));

import { DssApplicationShell } from "./session-application-shell";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.variant.mockResolvedValue("MODULE_LAUNCHER");
});

describe("server Application Shell authorization composition", () => {
  it("never calls IAM when viewer authentication fails", async () => {
    mocks.viewer.mockResolvedValue(null);
    const html = renderToStaticMarkup(
      await DssApplicationShell({
        children: createElement("span", null, "public content"),
      }),
    );
    expect(html).toContain('data-viewer="guest"');
    expect(html).toContain('data-admin="false"');
    expect(mocks.variant).toHaveBeenCalledOnce();
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("never exposes admin navigation without an explicit IAM grant", async () => {
    mocks.viewer.mockResolvedValue({ id: "u1", username: "member" });
    mocks.admin.mockResolvedValue(false);
    const html = renderToStaticMarkup(
      await DssApplicationShell({ children: "member" }),
    );
    expect(html).toContain('data-viewer="member"');
    expect(html).toContain('data-admin="false"');
    expect(mocks.admin).toHaveBeenCalledOnce();
  });

  it("uses the admin flag only after a validated viewer and IAM grant", async () => {
    mocks.viewer.mockResolvedValue({ id: "u2", username: "admin" });
    mocks.admin.mockResolvedValue(true);
    const html = renderToStaticMarkup(
      await DssApplicationShell({ children: "admin" }),
    );
    expect(html).toContain('data-admin="true"');
    expect(html).toContain('data-viewer="admin"');
  });

  it("fails closed if a validated viewer has no available IAM grant", async () => {
    mocks.viewer.mockResolvedValue({ id: "u3", username: "user" });
    mocks.admin.mockResolvedValue(false);
    const html = renderToStaticMarkup(
      await DssApplicationShell({ children: "ordinary" }),
    );
    expect(html).toContain('data-admin="false"');
  });
});
