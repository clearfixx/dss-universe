/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Media Platform Web
 * 📄 File: apps/web/src/components/media/media-library.spec.tsx
 *
 * 🎯 Purpose:
 * Verifies the permission-backed Media Library workspace presentation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "test-token" }),
  }),
}));
vi.mock("@/lib/apollo/rsc-client", () => ({
  getClient: () => ({ query }),
}));
vi.mock("@/app/media/actions", () => ({
  retryFailedMedia: vi.fn(),
}));

import { MediaLibrary } from "./media-library";

describe("MediaLibrary", () => {
  beforeEach(() => {
    query.mockResolvedValue({
      data: {
        mediaLibrary: {
          items: [
            {
              id: "media-1",
              ownerId: "owner-1",
              kind: "IMAGE",
              status: "FAILED",
              visibility: "PRIVATE",
              originalFilename: "mission-cover.png",
              mimeType: "image/png",
              extension: "png",
              size: 1536,
              width: 1200,
              height: 630,
              failureCode: "PROCESSING_FAILED",
              createdAt: "2026-07-25T00:00:00.000Z",
              updatedAt: "2026-07-25T00:01:00.000Z",
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
        mediaLibraryMetrics: {
          totalMedia: 12,
          originalBytes: 2048,
          variantBytes: 1024,
          totalBytes: 3072,
          orphanedMedia: 2,
          failedMedia: 1,
          quarantinedMedia: 1,
        },
      },
    });
  });

  it("renders metrics, catalog filters, failure state, and retry action", async () => {
    render(await MediaLibrary({ searchParams: {} }));

    expect(
      screen.getByRole("heading", { name: "DSS Media Platform" }),
    ).toBeInTheDocument();
    expect(screen.getByText("mission-cover.png")).toBeInTheDocument();
    expect(screen.getByText("PROCESSING_FAILED")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry processing" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: "Search Media Library" }),
    ).toBeInTheDocument();
  });
});
