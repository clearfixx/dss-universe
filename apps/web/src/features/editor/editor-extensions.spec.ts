/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/editor-extensions.spec.ts
 *
 * 🎯 Purpose:
 * Verifies that Tiptap extension sets respect DSS Editor profile boundaries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { describe, expect, it } from "vitest";

import { createEditorExtensions } from "./editor-extensions";

describe("DSS Editor extensions", () => {
  it("adds structured platform nodes to publication profiles", () => {
    const names = createEditorExtensions("WIKI").map(({ name }) => name);

    expect(names).toEqual(
      expect.arrayContaining([
        "starterKit",
        "textAlign",
        "codeBlock",
        "mention",
        "mediaReference",
        "attachment",
        "contentGate",
      ]),
    );
  });

  it("keeps Content Gates outside the comment profile", () => {
    const names = createEditorExtensions("COMMENT").map(({ name }) => name);

    expect(names).not.toContain("contentGate");
    expect(names).toContain("codeBlock");
    expect(names).toContain("attachment");
  });
});

/** Compact means smaller controls, never smaller validation. */
