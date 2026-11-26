import { describe, expect, it } from "vitest";

import { staffTag, staffTagRoles, wordDiff } from "./forum-staff-tags-model";

describe("staffTagRoles", () => {
  it("gives administrators every tag and others only their own", () => {
    expect(staffTagRoles("ADMINISTRATOR")).toEqual([
      "CURATOR",
      "MODERATOR",
      "SUPERMODERATOR",
      "ADMINISTRATOR",
    ]);
    expect(staffTagRoles("CURATOR")).toEqual(["CURATOR"]);
    expect(staffTagRoles(null)).toEqual([]);
    expect(staffTagRoles("SOMETHING")).toEqual([]);
  });

  it("falls back to the moderator look for unknown roles", () => {
    expect(staffTag("CURATOR").letter).toBe("К");
    expect(staffTag("X").letter).toBe("М");
  });
});

describe("wordDiff", () => {
  it("marks removed and added words", () => {
    expect(wordDiff("Як налаштувати черги", "Як правильно налаштувати черги")).toEqual([
      { text: "Як ", kind: "same" },
      { text: "правильно ", kind: "added" },
      { text: "налаштувати черги", kind: "same" },
    ]);
    expect(wordDiff("a b c", "a c")).toEqual([
      { text: "a ", kind: "same" },
      { text: "b ", kind: "removed" },
      { text: "c", kind: "same" },
    ]);
  });

  it("handles empty texts", () => {
    expect(wordDiff("", "new")).toEqual([{ text: "new", kind: "added" }]);
    expect(wordDiff("old", "")).toEqual([{ text: "old", kind: "removed" }]);
  });

  it("swaps huge texts without building the table", () => {
    const big = Array.from({ length: 2000 }, (_, i) => `w${i}`).join(" ");
    expect(wordDiff(big, big + " x").map(({ kind }) => kind)).toEqual([
      "removed",
      "added",
    ]);
  });
});
