/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: packages/editor/src/profiles.ts
 *
 * 🎯 Purpose:
 * Defines allowlisted node capabilities and safety limits for editor profiles.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { EditorProfile } from "./document";

export type EditorProfileDefinition = {
  profile: EditorProfile;
  maxCharacters: number;
  maxNodes: number;
  allowedNodes: readonly string[];
  allowedMarks: readonly string[];
  headingLevels: readonly number[];
};

const INLINE_NODES = ["text", "hardBreak", "mention"] as const;
const BASIC_BLOCKS = [
  "doc",
  "paragraph",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
] as const;
const MEDIA_NODES = ["mediaReference", "attachment"] as const;
const MARKS = ["bold", "italic", "strike", "code", "link"] as const;

export const EDITOR_PROFILE_DEFINITIONS: Record<
  EditorProfile,
  EditorProfileDefinition
> = {
  FULL: {
    profile: "FULL",
    maxCharacters: 200_000,
    maxNodes: 10_000,
    allowedNodes: [
      ...INLINE_NODES,
      ...BASIC_BLOCKS,
      ...MEDIA_NODES,
      "heading",
      "contentGate",
    ],
    allowedMarks: MARKS,
    headingLevels: [1, 2, 3, 4],
  },
  FORUM: {
    profile: "FORUM",
    maxCharacters: 50_000,
    maxNodes: 3_000,
    allowedNodes: [
      ...INLINE_NODES,
      ...BASIC_BLOCKS,
      ...MEDIA_NODES,
      "heading",
      "contentGate",
    ],
    allowedMarks: MARKS,
    headingLevels: [2, 3, 4],
  },
  COMPACT: {
    profile: "COMPACT",
    maxCharacters: 5_000,
    maxNodes: 500,
    allowedNodes: [
      ...INLINE_NODES,
      "doc",
      "paragraph",
      "bulletList",
      "orderedList",
      "listItem",
      "blockquote",
      "codeBlock",
      ...MEDIA_NODES,
    ],
    allowedMarks: MARKS,
    headingLevels: [],
  },
};

export function getEditorProfileDefinition(
  profile: EditorProfile,
): EditorProfileDefinition {
  return EDITOR_PROFILE_DEFINITIONS[profile];
}

/** Profiles trim capabilities, not trust boundaries; the server validates every one. */
