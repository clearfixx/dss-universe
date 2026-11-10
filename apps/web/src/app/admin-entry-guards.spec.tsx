import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  appearance: vi.fn(),
  feed: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/features/auth/admin-access", () => ({
  loadAdminCommandDeckAccess: mocks.access,
}));
vi.mock("@/features/appearance/appearance-data", () => ({
  loadAdminShellVariant: mocks.appearance,
}));
vi.mock("@/features/activity/activity-data", () => ({
  loadViewerActivityFeed: mocks.feed,
}));
vi.mock("@/components/shell/session-application-shell", () => ({
  DssApplicationShell: ({ children }: { children: ReactNode }) =>
    createElement("main", null, children),
}));
vi.mock("@/components/shell/command-deck-overview", () => ({
  CommandDeckOverview: () => createElement("div", null, "ADMIN_DECK"),
}));
vi.mock("@/features/appearance/platform-appearance-form", () => ({
  PlatformAppearanceForm: () =>
    createElement("div", null, "PLATFORM_APPEARANCE"),
}));

import CommandDeckPage from "./command-deck/page";
import PlatformAppearancePage from "./settings/platform-appearance/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.feed.mockResolvedValue(null);
});

describe("administrative route guards", () => {
  it("denies Command Deck before querying private activity", async () => {
    mocks.access.mockResolvedValue(false);
    await expect(CommandDeckPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.feed).not.toHaveBeenCalled();
  });

  it("renders Command Deck only after its independent IAM check", async () => {
    mocks.access.mockResolvedValue(true);
    const html = renderToStaticMarkup(await CommandDeckPage());
    expect(html).toContain("ADMIN_DECK");
    expect(mocks.feed).toHaveBeenCalledOnce();
  });

  it("denies platform appearance when the backend refuses administrative access", async () => {
    mocks.appearance.mockResolvedValue(null);
    await expect(PlatformAppearancePage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders platform appearance only after an approved variant", async () => {
    mocks.appearance.mockResolvedValue("HYBRID");
    const html = renderToStaticMarkup(await PlatformAppearancePage());
    expect(html).toContain("PLATFORM_APPEARANCE");
  });
});
