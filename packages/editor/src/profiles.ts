/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: packages/editor/src/profiles.ts
 *
 * 🎯 Purpose:
 * Declares product-specific DSS Editor profiles, schemas and toolbar layouts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  EDITOR_TOOL_DEFINITIONS,
  type EditorCapability,
  type EditorPermission,
  type EditorToolbarGroup,
} from "./capabilities";
import type { EditorProfile } from "./document";

export type EditorProfileDefinition = {
  profile: EditorProfile;
  maxCharacters: number;
  maxNodes: number;
  allowedNodes: readonly string[];
  allowedMarks: readonly string[];
  headingLevels: readonly number[];
  capabilities: readonly EditorCapability[];
  toolbar: readonly EditorToolbarGroup[];
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

const COMPACT_CAPABILITIES = [
  "BOLD",
  "ITALIC",
  "INLINE_CODE",
  "TEXT_ALIGN",
  "LINK",
  "CODE_BLOCK",
  "MENTION",
  "MEDIA_IMAGE",
  "MEDIA_VIDEO",
  "ATTACHMENT",
  "HISTORY",
] as const satisfies readonly EditorCapability[];
const REPLY_CAPABILITIES = [
  ...COMPACT_CAPABILITIES,
  "STRIKE",
  "BULLET_LIST",
  "ORDERED_LIST",
  "BLOCKQUOTE",
] as const satisfies readonly EditorCapability[];
const PUBLICATION_CAPABILITIES = [
  ...REPLY_CAPABILITIES,
  "HEADING",
  "CONTENT_GATE",
  "AI_ASSIST",
] as const satisfies readonly EditorCapability[];

const COMPACT_TOOLBAR = [
  { id: "format", tools: ["bold", "italic", "inlineCode", "link"] },
  { id: "alignment", tools: ["alignLeft", "alignCenter"] },
  {
    id: "insert",
    tools: ["mention", "image", "video", "attachment", "codeBlock"],
  },
  { id: "history", tools: ["undo", "redo"] },
] as const satisfies readonly EditorToolbarGroup[];
const REPLY_TOOLBAR = [
  { id: "format", tools: ["bold", "italic", "strike", "inlineCode", "link"] },
  { id: "alignment", tools: ["alignLeft", "alignCenter"] },
  {
    id: "structure",
    tools: ["bulletList", "orderedList", "blockquote", "codeBlock"],
  },
  { id: "insert", tools: ["mention", "image", "video", "attachment"] },
  { id: "history", tools: ["undo", "redo"] },
] as const satisfies readonly EditorToolbarGroup[];
const PUBLICATION_TOOLBAR = [
  { id: "format", tools: ["bold", "italic", "strike", "inlineCode", "link"] },
  { id: "alignment", tools: ["alignLeft", "alignCenter"] },
  {
    id: "structure",
    tools: ["heading", "bulletList", "orderedList", "blockquote", "codeBlock"],
  },
  {
    id: "insert",
    tools: ["mention", "image", "video", "attachment", "contentGate"],
  },
  { id: "intelligence", tools: ["aiAssist"] },
  { id: "history", tools: ["undo", "redo"] },
] as const satisfies readonly EditorToolbarGroup[];

function compact(
  profile: EditorProfile,
  maxCharacters: number,
): EditorProfileDefinition {
  return {
    profile,
    maxCharacters,
    maxNodes: 750,
    allowedNodes: [...INLINE_NODES, ...BASIC_BLOCKS, ...MEDIA_NODES],
    allowedMarks: MARKS,
    headingLevels: [],
    capabilities: COMPACT_CAPABILITIES,
    toolbar: COMPACT_TOOLBAR,
  };
}

function reply(
  profile: EditorProfile,
  maxCharacters: number,
): EditorProfileDefinition {
  return {
    profile,
    maxCharacters,
    maxNodes: 3_000,
    allowedNodes: [...INLINE_NODES, ...BASIC_BLOCKS, ...MEDIA_NODES],
    allowedMarks: MARKS,
    headingLevels: [],
    capabilities: REPLY_CAPABILITIES,
    toolbar: REPLY_TOOLBAR,
  };
}

function publication(
  profile: EditorProfile,
  maxCharacters: number,
  maxNodes: number,
  headingLevels: readonly number[],
): EditorProfileDefinition {
  return {
    profile,
    maxCharacters,
    maxNodes,
    allowedNodes: [
      ...INLINE_NODES,
      ...BASIC_BLOCKS,
      ...MEDIA_NODES,
      "heading",
      "contentGate",
    ],
    allowedMarks: MARKS,
    headingLevels,
    capabilities: PUBLICATION_CAPABILITIES,
    toolbar: PUBLICATION_TOOLBAR,
  };
}

export const EDITOR_PROFILE_DEFINITIONS: Record<
  EditorProfile,
  EditorProfileDefinition
> = {
  COMMENT: compact("COMMENT", 5_000),
  MESSAGE: compact("MESSAGE", 10_000),
  FORUM_REPLY: reply("FORUM_REPLY", 30_000),
  FORUM_TOPIC: publication("FORUM_TOPIC", 75_000, 4_000, [2, 3, 4]),
  NEWS: publication("NEWS", 150_000, 8_000, [1, 2, 3, 4]),
  RESEARCH_ARTICLE: publication(
    "RESEARCH_ARTICLE",
    250_000,
    12_000,
    [1, 2, 3, 4],
  ),
  WIKI: publication("WIKI", 300_000, 15_000, [1, 2, 3, 4]),
  ADMIN: publication("ADMIN", 300_000, 15_000, [1, 2, 3, 4]),
};

export function getEditorProfileDefinition(
  profile: EditorProfile,
): EditorProfileDefinition {
  return EDITOR_PROFILE_DEFINITIONS[profile];
}

export type ResolvedEditorProfile = {
  profile: EditorProfile;
  capabilities: readonly EditorCapability[];
  toolbar: readonly EditorToolbarGroup[];
};

export function resolveEditorProfile(
  profile: EditorProfile,
  permissions: readonly EditorPermission[] = [],
): ResolvedEditorProfile {
  const { capabilities, toolbar } = getEditorProfileDefinition(profile);
  const permissionSet = new Set(permissions);
  const resolvedToolbar = toolbar
    .map((group) => ({
      ...group,
      tools: group.tools.filter((toolId) => {
        const tool = EDITOR_TOOL_DEFINITIONS[toolId];
        return (
          capabilities.includes(tool.capability) &&
          (!tool.requiredPermission ||
            permissionSet.has(tool.requiredPermission))
        );
      }),
    }))
    .filter(({ tools }) => tools.length > 0);

  return { profile, capabilities, toolbar: resolvedToolbar };
}

/** One engine, many missions; capability profiles keep every cockpit intentional. */
