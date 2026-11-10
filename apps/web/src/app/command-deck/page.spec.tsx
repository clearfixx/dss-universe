import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("@/features/auth/admin-access", () => ({
  loadAdminCommandDeckAccess: vi.fn(),
}));
vi.mock("@/features/activity/activity-data", () => ({
  loadViewerActivityFeed: vi.fn(),
}));
vi.mock("@/components/shell/command-deck-overview", () => ({
  CommandDeckOverview: () => null,
}));
vi.mock("@/components/shell/session-application-shell", () => ({
  DssApplicationShell: () => null,
}));

import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";
import { loadViewerActivityFeed } from "@/features/activity/activity-data";

import CommandDeckPage from "./page";

describe("administrative Command Deck server boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("never fetches dashboard activity when IAM denies access", async () => {
    vi.mocked(loadAdminCommandDeckAccess).mockResolvedValue(false);

    await expect(CommandDeckPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(loadViewerActivityFeed).not.toHaveBeenCalled();
  });

  it("loads dashboard activity only after IAM explicitly allows access", async () => {
    vi.mocked(loadAdminCommandDeckAccess).mockResolvedValue(true);
    vi.mocked(loadViewerActivityFeed).mockResolvedValue(null);

    await expect(CommandDeckPage()).resolves.toBeDefined();
    expect(loadViewerActivityFeed).toHaveBeenCalledOnce();
  });
});
