import { describe, expect, it } from "vitest";

import {
  pageFormError,
  pageStateLabel,
  suggestSlug,
} from "./static-page-model";

describe("static page model", () => {
  it("suggests a Latin address from a Ukrainian title", () => {
    expect(suggestSlug("Правила спільноти")).toBe("pravyla-spilnoty");
    expect(suggestSlug("  Об'єднання: 2026!  ")).toBe("obiednannia-2026");
    expect(suggestSlug("!!!")).toBe("");
    expect(suggestSlug("а".repeat(120)).length).toBe(80);
  });

  it("checks the form like the API does", () => {
    const ok = { title: "Rules", slug: "rules", description: "" };
    expect(pageFormError(ok)).toBeNull();
    expect(pageFormError({ ...ok, title: "ab" })).toMatch(/Назва/);
    expect(pageFormError({ ...ok, slug: "a--b" })).toMatch(/Адреса/);
    expect(pageFormError({ ...ok, description: "x".repeat(301) })).toMatch(
      /Опис/,
    );
  });

  it("names the publication state", () => {
    expect(pageStateLabel({ hasUnpublishedChanges: false })).toBe("Чернетка");
    expect(
      pageStateLabel({ publishedAt: "now", hasUnpublishedChanges: false }),
    ).toBe("Опубліковано");
    expect(
      pageStateLabel({ publishedAt: "now", hasUnpublishedChanges: true }),
    ).toMatch(/неопубліковані/);
  });
});
