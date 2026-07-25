/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Media Platform Web
 * 📄 File: apps/web/src/components/media/media-library.utils.spec.ts
 *
 * 🎯 Purpose:
 * Verifies safe Media Library filters, pagination URLs, and byte metrics.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { describe, expect, it } from "vitest";

import {
  createMediaLibraryInput,
  createNextPageHref,
  formatBytes,
} from "./media-library.utils";

describe("Media Library helpers", () => {
  it("accepts supported filters and rejects arbitrary enum values", () => {
    expect(
      createMediaLibraryInput({
        search: "  avatar ",
        status: "FAILED",
        kind: "IMAGE",
        visibility: "PRIVATE",
        orphaned: "true",
      }),
    ).toMatchObject({
      first: 24,
      search: "avatar",
      status: "FAILED",
      kind: "IMAGE",
      visibility: "PRIVATE",
      orphaned: true,
    });
    expect(
      createMediaLibraryInput({
        status: "HACKED",
        kind: "EXECUTABLE",
        visibility: "INTERNAL",
      }),
    ).toMatchObject({
      status: undefined,
      kind: undefined,
      visibility: undefined,
    });
  });

  it("preserves active filters while replacing the pagination cursor", () => {
    expect(
      createNextPageHref(
        { status: "FAILED", search: "avatar", after: "old" },
        "next cursor",
      ),
    ).toBe("/media?status=FAILED&search=avatar&after=next+cursor");
  });

  it("formats storage metrics without losing useful precision", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.50 KB");
    expect(formatBytes(12 * 1024 * 1024)).toBe("12.0 MB");
  });
});
