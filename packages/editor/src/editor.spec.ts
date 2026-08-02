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
  resolveEditorProfile,
  validateEditorDocument,
} from "./index";

describe("DSS Editor document contract", () => {
  it("accepts a versioned full document and derives stable projections", () => {
    const document = {
      schemaVersion: 1,
      profile: "WIKI",
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

  it("rejects arbitrary nodes, unsafe links and comment headings", () => {
    const result = validateEditorDocument({
      schemaVersion: 1,
      profile: "COMMENT",
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
    for (const profile of [
      "COMMENT",
      "FORUM_REPLY",
      "FORUM_TOPIC",
      "NEWS",
      "RESEARCH_ARTICLE",
      "WIKI",
      "MESSAGE",
      "ADMIN",
    ] as const) {
      expect(
        validateEditorDocument(createEmptyEditorDocument(profile)).valid,
      ).toBe(true);
    }
  });

  it("resolves module toolbars through explicit privileged permissions", () => {
    const publicComment = resolveEditorProfile("COMMENT");
    const commentTools = publicComment.toolbar.flatMap(({ tools }) => tools);
    expect(commentTools).toContain("bold");
    expect(commentTools).not.toContain("image");
    expect(commentTools).not.toContain("contentGate");

    const wiki = resolveEditorProfile("WIKI", [
      "MEDIA_UPLOAD",
      "CONTENT_GATE_CONFIGURE",
      "AI_ASSIST",
    ]);
    const wikiTools = wiki.toolbar.flatMap(({ tools }) => tools);
    expect(wikiTools).toEqual(
      expect.arrayContaining(["heading", "image", "contentGate", "aiAssist"]),
    );
  });
});

/** The smallest valid document is still a real, versioned contract. */
