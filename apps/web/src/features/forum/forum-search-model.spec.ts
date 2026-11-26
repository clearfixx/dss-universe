import { describe, expect, it } from "vitest";

import {
  normalizeSearchTerm,
  searchPage,
  searchSegments,
  searchTab,
} from "./forum-search-model";

describe("forum search model", () => {
  it("normalises the term to the API limit", () => {
    expect(normalizeSearchTerm("  next.js   кеш ")).toBe("next.js кеш");
    expect(normalizeSearchTerm("x".repeat(120))).toHaveLength(100);
    expect(normalizeSearchTerm(["a"])).toBe("");
  });

  it("highlights every occurrence regardless of case", () => {
    expect(searchSegments("Кеш і ще кеш", "КЕШ")).toEqual([
      { text: "Кеш", match: true },
      { text: " і ще ", match: false },
      { text: "кеш", match: true },
    ]);
    expect(searchSegments("без збігів", "кеш")).toEqual([
      { text: "без збігів", match: false },
    ]);
  });

  it("parses tab and page safely", () => {
    expect(searchTab("news")).toBe("news");
    expect(searchTab("users")).toBe("topics");
    expect(searchPage("3")).toBe(3);
    expect(searchPage("-2")).toBe(1);
    expect(searchPage("2.5")).toBe(1);
  });
});
