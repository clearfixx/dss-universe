/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: packages/editor/src/editor.spec.ts
 *
 * 🎯 Purpose:
 * Verifies canonical editor validation, profiles and text projections.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { describe, expect, it } from "vitest";

import {
  createEmptyEditorDocument,
  projectEditorPlainText,
  projectEditorSearchText,
  validateEditorDocument,
} from "./index";

describe("DSS Editor document contract", () => {
  it("accepts a versioned full document and derives stable projections", () => {
    const document = {
      schemaVersion: 1,
      profile: "FULL",
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "DSS Editor" }],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Привіт, " },
              {
                type: "mention",
                attrs: {
                  userId: "123e4567-e89b-42d3-a456-426614174000",
                  username: "Commander",
                },
              },
            ],
          },
          {
            type: "codeBlock",
            attrs: { language: "typescript" },
            content: [{ type: "text", text: "const ready = true;" }],
          },
        ],
      },
    };

    const result = validateEditorDocument(document);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(projectEditorPlainText(result.document)).toContain("@Commander");
    expect(projectEditorSearchText(result.document)).toContain("dss editor");
  });

  it("rejects arbitrary nodes, unsafe links and compact headings", () => {
    const result = validateEditorDocument({
      schemaVersion: 1,
      profile: "COMPACT",
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "No" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "click",
                marks: [
                  { type: "link", attrs: { href: "javascript:alert(1)" } },
                ],
              },
            ],
          },
          { type: "html", attrs: { source: "<script />" } },
        ],
      },
    });

    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.map(({ code }) => code)).toEqual(
      expect.arrayContaining(["NODE_NOT_ALLOWED", "LINK_URL"]),
    );
  });

  it("creates valid empty documents for every profile", () => {
    for (const profile of ["FULL", "FORUM", "COMPACT"] as const) {
      expect(
        validateEditorDocument(createEmptyEditorDocument(profile)).valid,
      ).toBe(true);
    }
  });
});

/** The smallest valid document is still a real, versioned contract. */
