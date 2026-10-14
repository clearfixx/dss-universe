/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform Tests
 * 📄 File: packages/editor/src/public-search-projections.spec.ts
 *
 * 🎯 Purpose:
 * Pins public-only projection semantics without viewer policy or database logic.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { describe, expect, it } from "vitest";
import {
  projectEditorPublicSearch,
  projectEditorSearchText,
  type EditorDocument,
  type EditorNode,
} from "./index";

function document(...content: EditorNode[]): EditorDocument {
  return {
    schemaVersion: 1,
    profile: "NEWS",
    content: { type: "doc", content },
  };
}

function paragraph(text: string): EditorNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function gate(...content: EditorNode[]): EditorNode {
  return { type: "contentGate", attrs: { gateId: "synthetic-id" }, content };
}

describe("public Editor search projection", () => {
  it("retains ungated canonical leaf, separator and normalization semantics", () => {
    const input = document(
      { type: "heading", content: [{ type: "text", text: "ＤＳＳ" }] },
      {
        type: "paragraph",
        content: [
          { type: "mention", attrs: { username: "Командир" } },
          { type: "hardBreak" },
          { type: "text", text: "Код" },
        ],
      },
      { type: "codeBlock", content: [{ type: "text", text: "const x = 1;" }] },
      { type: "mediaReference", attrs: { caption: "Caption", alt: "Unused" } },
      { type: "mediaReference", attrs: { alt: "Alt" } },
      { type: "attachment", attrs: { label: "Download", mediaId: "not-text" } },
      { type: "footnoteReference", attrs: { noteId: "note" } },
      { type: "tableOfContents" },
    );
    expect(projectEditorPublicSearch(input)).toEqual({
      searchText: projectEditorSearchText(input),
      hasContentGates: false,
    });
    expect(projectEditorPublicSearch(input).searchText).toBe(
      "dss @командир код const x = 1; captionaltdownload[note]",
    );
  });

  it("omits every protected leaf and matches the denied empty-gate separator", () => {
    const input = document(
      paragraph("alpha"),
      gate(
        paragraph("secret"),
        {
          type: "attachment",
          attrs: { label: "secret-label", mediaId: "secret-id" },
        },
        { type: "mediaReference", attrs: { caption: "secret-caption" } },
        gate(paragraph("nested-secret")),
      ),
      paragraph("gamma"),
    );
    const before = JSON.stringify(input);
    expect(projectEditorPublicSearch(input)).toEqual({
      searchText: "alpha gamma",
      hasContentGates: true,
    });
    expect(projectEditorPublicSearch(input).searchText).toBe(
      projectEditorSearchText(
        document(paragraph("alpha"), gate(), paragraph("gamma")),
      ),
    );
    expect(JSON.stringify(input)).toBe(before);
    expect(projectEditorSearchText(input)).toContain("secret");
  });

  it("does not inspect denied descendants or attributes", () => {
    const protectedNode: EditorNode = { type: "contentGate" };
    Object.defineProperties(protectedNode, {
      content: {
        get: () => {
          throw new Error("Protected children visited");
        },
      },
      attrs: {
        get: () => {
          throw new Error("Protected attributes visited");
        },
      },
    });
    expect(projectEditorPublicSearch(document(protectedNode))).toEqual({
      searchText: "",
      hasContentGates: true,
    });
  });

  it.each([
    [[], "", false],
    [[gate()], "", true],
    [[gate(), gate(), paragraph("visible"), gate()], "visible", true],
    [
      [
        {
          type: "blockquote",
          content: [
            paragraph("before"),
            gate(paragraph("secret")),
            paragraph("after"),
          ],
        },
      ],
      "before after",
      true,
    ],
    [
      [
        paragraph(" alpha \t"),
        gate(paragraph("secret")),
        paragraph("\n\n gamma "),
      ],
      "alpha gamma",
      true,
    ],
  ] as [EditorNode[], string, boolean][])(
    "projects structural case %# without residual payload",
    (nodes, searchText, hasContentGates) => {
      expect(projectEditorPublicSearch(document(...nodes))).toEqual({
        searchText,
        hasContentGates,
      });
    },
  );

  it.each([
    ["e", "\u0301", "é"],
    ["ΣΟ", "Σ", "σος"],
    ["İ", "", "i\u0307"],
    ["\u{1ccd6}", "", "a"],
    ["\u{105d2}", "\u0307", "\u{105c9}"],
  ])(
    "normalizes complete visible inline text %j + %j",
    (left, right, expected) => {
      const input = document({
        type: "paragraph",
        content: [
          { type: "text", text: left },
          { type: "text", text: right },
        ],
      });
      expect(projectEditorPublicSearch(input).searchText).toBe(expected);
      expect(projectEditorPublicSearch(input).searchText).toBe(
        projectEditorSearchText(input),
      );
    },
  );

  it("does not treat public-only phrase matches as monotonic viewer verdicts", () => {
    const input = document(
      paragraph("alpha"),
      gate(paragraph("secret")),
      paragraph("gamma"),
    );
    expect(projectEditorPublicSearch(input).searchText).toContain(
      "alpha gamma",
    );
    expect(projectEditorSearchText(input)).not.toContain("alpha gamma");
    expect(projectEditorSearchText(input)).toContain("alpha secret gamma");
  });
});
