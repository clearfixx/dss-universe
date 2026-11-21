import { describe, expect, it } from "vitest";

import { viewerDisplayName } from "./personal-hub-presentation";

const viewer = { id: "viewer-1", username: "andrii" };

describe("Personal Hub viewer label", () => {
  it("uses and trims a non-empty display name", () => {
    expect(viewerDisplayName({ ...viewer, displayName: "  Андрій  " })).toBe("Андрій");
  });

  it("falls back to username for missing or whitespace-only display names", () => {
    expect(viewerDisplayName(viewer)).toBe("andrii");
    expect(viewerDisplayName({ ...viewer, displayName: null })).toBe("andrii");
    expect(viewerDisplayName({ ...viewer, displayName: " \t " })).toBe("andrii");
  });
});
