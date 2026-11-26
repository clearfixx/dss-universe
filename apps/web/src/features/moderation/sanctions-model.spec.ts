import { describe, expect, it } from "vitest";

import { sanctionKind, sanctionStatus } from "./sanctions-model";

describe("sanctions model", () => {
  it("derives the display status", () => {
    expect(sanctionStatus({ active: true })).toBe("active");
    expect(sanctionStatus({ active: false })).toBe("expired");
    expect(
      sanctionStatus({ active: false, revokedAt: "2026-11-20T10:00:00Z" }),
    ).toBe("revoked");
    expect(
      sanctionStatus({ active: true, consumedAt: "2026-11-20T10:00:00Z" }),
    ).toBe("consumed");
  });

  it("parses the kind filter safely", () => {
    expect(sanctionKind("WARNING")).toBe("WARNING");
    expect(sanctionKind("READ_ONLY")).toBe("READ_ONLY");
    expect(sanctionKind("BAN")).toBeNull();
  });
});
