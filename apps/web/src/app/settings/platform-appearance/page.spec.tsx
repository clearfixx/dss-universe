import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("@/features/appearance/appearance-data", () => ({
  loadAdminShellVariant: vi.fn(),
}));
vi.mock("@/features/appearance/platform-appearance-form", () => ({
  PlatformAppearanceForm: () => null,
}));
vi.mock("@/components/shell/session-application-shell", () => ({
  DssApplicationShell: () => null,
}));

import { loadAdminShellVariant } from "@/features/appearance/appearance-data";

import PlatformAppearancePage from "./page";

describe("administrative platform appearance page boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not found when IAM denies configuration access", async () => {
    vi.mocked(loadAdminShellVariant).mockResolvedValue(null);

    await expect(PlatformAppearancePage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it.each(["MODULE_LAUNCHER", "HORIZONTAL_NAVIGATION", "HYBRID"] as const)(
    "renders the protected settings page for a permitted %s variant",
    async (variant) => {
      vi.mocked(loadAdminShellVariant).mockResolvedValue(variant);

      await expect(PlatformAppearancePage()).resolves.toBeDefined();
      expect(loadAdminShellVariant).toHaveBeenCalledOnce();
    },
  );
});
