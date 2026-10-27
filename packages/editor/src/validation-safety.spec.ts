/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor validation security tests
 * 📄 File: packages/editor/src/validation-safety.spec.ts
 *
 * 🎯 Purpose:
 * Pin controlled rejection of malformed and depth-unbounded editor JSON.
 *
 * 🧠 Responsibilities:
 * • verify the approved root-zero depth boundary for every profile;
 * • reject invalid containers without runtime exceptions;
 * • preserve canonical valid documents without repair or mutation.
 *
 * 🏗️ Architecture:
 * Shared contract tests; no database, transport or UI dependencies.
 *
 * ⚠️ Important:
 * A rejected document must never be silently truncated into a valid document.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { describe, expect, it } from "vitest";
import {
  EDITOR_PROFILES,
  type EditorNode,
  type EditorProfile,
} from "./document";
import { validateEditorDocument } from "./validation";
import { getEditorProfileDefinition } from "./profiles";

function nestedDocument(profile: EditorProfile, depth: number) {
  let node: EditorNode = {
    type: "paragraph",
    content: [{ type: "text", text: "boundary" }],
  };
  for (let level = 2; level < depth; level++) {
    node = { type: "blockquote", content: [node] };
  }
  return {
    schemaVersion: 1,
    profile,
    content: { type: "doc", content: [node] },
  };
}

function documentWith(node: unknown) {
  return {
    schemaVersion: 1,
    profile: "NEWS",
    content: { type: "doc", content: [node] },
  };
}

describe("Editor untrusted JSON safety", () => {
  for (const profile of EDITOR_PROFILES) {
    it(`${profile} accepts deepest text at depth 64 without mutation`, () => {
      const document = nestedDocument(profile, 64);
      const before = JSON.stringify(document);
      const result = validateEditorDocument(document);
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.document).toBe(document);
      expect(JSON.stringify(document)).toBe(before);
    });

    it(`${profile} rejects deepest text at depth 65`, () => {
      const document = nestedDocument(profile, 65);
      expect(() => validateEditorDocument(document)).not.toThrow();
      const result = validateEditorDocument(document);
      expect(result.valid).toBe(false);
      if (!result.valid)
        expect(result.errors.map(({ code }) => code)).toEqual(["DEPTH_LIMIT"]);
    });
  }

  it.each([null, false, 1, "node", []])(
    "rejects malformed child %j without throwing",
    (node) => {
      const document = documentWith(node);
      expect(() => validateEditorDocument(document)).not.toThrow();
      expect(validateEditorDocument(document).valid).toBe(false);
    },
  );

  for (const field of ["content", "marks", "attrs"] as const) {
    for (const value of [null, false, 1, "invalid"]) {
      it(`rejects ${field}=${JSON.stringify(value)} without throwing`, () => {
        const document = documentWith({ type: "paragraph", [field]: value });
        expect(() => validateEditorDocument(document)).not.toThrow();
        expect(validateEditorDocument(document).valid).toBe(false);
      });
    }
  }

  it.each([{}, { type: "bold", attrs: [] }, { type: "bold", attrs: null }])(
    "rejects malformed mark %j without throwing",
    (mark) => {
      const document = documentWith({
        type: "paragraph",
        content: [{ type: "text", text: "marked", marks: [mark] }],
      });
      expect(() => validateEditorDocument(document)).not.toThrow();
      expect(validateEditorDocument(document).valid).toBe(false);
    },
  );

  it.each([
    { type: "paragraph", content: {} },
    { type: "paragraph", marks: {} },
    { type: "paragraph", attrs: [] },
  ])("rejects invalid container shape %j", (node) => {
    expect(() => validateEditorDocument(documentWith(node))).not.toThrow();
    expect(validateEditorDocument(documentWith(node)).valid).toBe(false);
  });

  it("preserves legal empty optional containers", () => {
    expect(
      validateEditorDocument(
        documentWith({
          type: "paragraph",
          attrs: {},
          marks: [],
          content: [],
        }),
      ).valid,
    ).toBe(true);
  });

  it("accepts the exact existing node budget and stops before inspecting an excess node", () => {
    const { maxNodes } = getEditorProfileDefinition("COMMENT");
    const content: unknown[] = Array.from({ length: maxNodes - 1 }, () => ({
      type: "paragraph",
    }));
    const document = {
      schemaVersion: 1,
      profile: "COMMENT",
      content: { type: "doc", content },
    };
    expect(validateEditorDocument(document).valid).toBe(true);
    // Test-only sentinel proves early stopping; ordinary JSON cannot contain getters.
    content.push(
      Object.defineProperty({}, "type", {
        get() {
          throw new Error("Excess node inspected");
        },
      }),
    );
    expect(() => validateEditorDocument(document)).not.toThrow();
    const result = validateEditorDocument(document);
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors.map(({ code }) => code)).toEqual(["NODE_LIMIT"]);
  });

  it("rejects 12000-level parsed JSON without exhausting the call stack", () => {
    const wrappers = 11998;
    const json =
      '{"schemaVersion":1,"profile":"NEWS","content":{"type":"doc","content":[' +
      '{"type":"blockquote","content":['.repeat(wrappers) +
      '{"type":"paragraph","content":[{"type":"text","text":"deep"}]}' +
      "]}".repeat(wrappers) +
      "]}}";
    const document: unknown = JSON.parse(json);
    expect(() => validateEditorDocument(document)).not.toThrow();
    expect(validateEditorDocument(document).valid).toBe(false);
  });
});
