/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: packages/editor/src/capabilities.ts
 *
 * 🎯 Purpose:
 * Defines framework-neutral editor capabilities, permissions and toolbar tools.
 *
 * 🧠 Responsibilities:
 * • keeps module profiles independent from Tiptap and React;
 * • maps every toolbar tool to a declared capability;
 * • filters privileged tools through explicit editor permissions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export const EDITOR_CAPABILITIES = [
  "BOLD",
  "ITALIC",
  "STRIKE",
  "INLINE_CODE",
  "TEXT_ALIGN",
  "LINK",
  "HEADING",
  "BULLET_LIST",
  "ORDERED_LIST",
  "BLOCKQUOTE",
  "CODE_BLOCK",
  "MENTION",
  "MEDIA_IMAGE",
  "MEDIA_VIDEO",
  "ATTACHMENT",
  "CONTENT_GATE",
  "AI_ASSIST",
  "HISTORY",
] as const;
export type EditorCapability = (typeof EDITOR_CAPABILITIES)[number];

export const EDITOR_PERMISSIONS = [
  "MEDIA_UPLOAD",
  "CONTENT_GATE_CONFIGURE",
  "AI_ASSIST",
] as const;
export type EditorPermission = (typeof EDITOR_PERMISSIONS)[number];

export const EDITOR_TOOL_IDS = [
  "bold",
  "italic",
  "strike",
  "inlineCode",
  "alignLeft",
  "alignCenter",
  "link",
  "heading",
  "bulletList",
  "orderedList",
  "blockquote",
  "codeBlock",
  "mention",
  "image",
  "video",
  "attachment",
  "contentGate",
  "aiAssist",
  "undo",
  "redo",
] as const;
export type EditorToolId = (typeof EDITOR_TOOL_IDS)[number];

export type EditorToolbarGroup = {
  id:
    | "format"
    | "alignment"
    | "structure"
    | "insert"
    | "intelligence"
    | "history";
  tools: readonly EditorToolId[];
};

export type EditorToolDefinition = {
  id: EditorToolId;
  capability: EditorCapability;
  requiredPermission?: EditorPermission;
  action: "COMMAND" | "DIALOG";
};

export const EDITOR_TOOL_DEFINITIONS: Record<
  EditorToolId,
  EditorToolDefinition
> = {
  bold: { id: "bold", capability: "BOLD", action: "COMMAND" },
  italic: { id: "italic", capability: "ITALIC", action: "COMMAND" },
  strike: { id: "strike", capability: "STRIKE", action: "COMMAND" },
  inlineCode: {
    id: "inlineCode",
    capability: "INLINE_CODE",
    action: "COMMAND",
  },
  alignLeft: {
    id: "alignLeft",
    capability: "TEXT_ALIGN",
    action: "COMMAND",
  },
  alignCenter: {
    id: "alignCenter",
    capability: "TEXT_ALIGN",
    action: "COMMAND",
  },
  link: { id: "link", capability: "LINK", action: "DIALOG" },
  heading: { id: "heading", capability: "HEADING", action: "COMMAND" },
  bulletList: {
    id: "bulletList",
    capability: "BULLET_LIST",
    action: "COMMAND",
  },
  orderedList: {
    id: "orderedList",
    capability: "ORDERED_LIST",
    action: "COMMAND",
  },
  blockquote: {
    id: "blockquote",
    capability: "BLOCKQUOTE",
    action: "COMMAND",
  },
  codeBlock: {
    id: "codeBlock",
    capability: "CODE_BLOCK",
    action: "COMMAND",
  },
  mention: { id: "mention", capability: "MENTION", action: "DIALOG" },
  image: {
    id: "image",
    capability: "MEDIA_IMAGE",
    requiredPermission: "MEDIA_UPLOAD",
    action: "DIALOG",
  },
  video: {
    id: "video",
    capability: "MEDIA_VIDEO",
    requiredPermission: "MEDIA_UPLOAD",
    action: "DIALOG",
  },
  attachment: {
    id: "attachment",
    capability: "ATTACHMENT",
    requiredPermission: "MEDIA_UPLOAD",
    action: "DIALOG",
  },
  contentGate: {
    id: "contentGate",
    capability: "CONTENT_GATE",
    requiredPermission: "CONTENT_GATE_CONFIGURE",
    action: "DIALOG",
  },
  aiAssist: {
    id: "aiAssist",
    capability: "AI_ASSIST",
    requiredPermission: "AI_ASSIST",
    action: "DIALOG",
  },
  undo: { id: "undo", capability: "HISTORY", action: "COMMAND" },
  redo: { id: "redo", capability: "HISTORY", action: "COMMAND" },
};

/** Toolbars are configuration, not permission systems; persistence rechecks every privileged action. */
