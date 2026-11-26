import { describe, expect, it } from "vitest";

import { suggestTagSlug, tagDraftError } from "./forum-tags-model";

describe("forum tags model", () => {
  it("suggests API-valid slugs from labels", () => {
    expect(suggestTagSlug("Next.js 16")).toBe("next-js-16");
    expect(suggestTagSlug("Кешування")).toBe("keshuvannia");
    expect(suggestTagSlug("  Ґанок і Їжак ")).toBe("ganok-i-izhak");
    expect(suggestTagSlug("—")).toBe("");
    expect(suggestTagSlug("a".repeat(60))).toHaveLength(40);
  });

  it("validates like the API", () => {
    expect(tagDraftError({ slug: "cache", label: "Кеш" })).toBeNull();
    expect(tagDraftError({ slug: "Cache", label: "Кеш" })).not.toBeNull();
    expect(tagDraftError({ slug: "-x", label: "X" })).not.toBeNull();
    expect(tagDraftError({ slug: "x", label: " " })).not.toBeNull();
  });
});
