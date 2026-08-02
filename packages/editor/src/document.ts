/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: packages/editor/src/document.ts
 *
 * 🎯 Purpose:
 * Defines the versioned canonical JSON document used across DSS content modules.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export const DSS_EDITOR_SCHEMA_VERSION = 1 as const;

export const EDITOR_PROFILES = ["FULL", "FORUM", "COMPACT"] as const;
export type EditorProfile = (typeof EDITOR_PROFILES)[number];

export const EDITOR_CODE_LANGUAGES = [
  "plaintext",
  "bash",
  "css",
  "graphql",
  "html",
  "javascript",
  "json",
  "jsx",
  "markdown",
  "prisma",
  "python",
  "sql",
  "tsx",
  "typescript",
  "yaml",
] as const;
export type EditorCodeLanguage = (typeof EDITOR_CODE_LANGUAGES)[number];

export type EditorMark = {
  type: "bold" | "italic" | "strike" | "code" | "link";
  attrs?: Record<string, unknown>;
};

export type EditorNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: EditorNode[];
  marks?: EditorMark[];
  text?: string;
};

export type EditorDocument = {
  schemaVersion: typeof DSS_EDITOR_SCHEMA_VERSION;
  profile: EditorProfile;
  content: EditorNode & { type: "doc" };
};

export function createEmptyEditorDocument(
  profile: EditorProfile,
): EditorDocument {
  return {
    schemaVersion: DSS_EDITOR_SCHEMA_VERSION,
    profile,
    content: {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
  };
}

/** The schema has a version because “we will never change it” is not a schema plan. */
