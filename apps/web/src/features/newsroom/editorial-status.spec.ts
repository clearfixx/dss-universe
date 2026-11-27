import { describe, expect, it } from "vitest";
import { editorialStatus } from "./editorial-status";

describe("editorial status presentation", () => {
  it("maps all existing states to semantic variants", () => {
    expect(["DRAFT", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"].map((state) => editorialStatus(state).variant)).toEqual(["secondary", "info", "warning", "success", "info", "success", "outline"]);
  });
  it("preserves unknown states without inventing a successful status", () => {
    expect(editorialStatus("UNKNOWN")).toEqual({ label: "UNKNOWN", variant: "outline" });
    expect(editorialStatus("constructor")).toEqual({ label: "constructor", variant: "outline" });
  });
});
