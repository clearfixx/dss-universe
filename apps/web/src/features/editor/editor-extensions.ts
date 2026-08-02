/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/editor-extensions.ts
 *
 * 🎯 Purpose:
 * Maps DSS Editor profiles and custom canonical nodes to Tiptap extensions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Node, mergeAttributes, type Extensions } from "@tiptap/core";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import type { EditorProfile } from "@dss/editor";
import { getEditorProfileDefinition } from "@dss/editor";

const MentionNode = Node.create({
  name: "mention",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({
    userId: { default: null },
    username: { default: null },
  }),
  parseHTML: () => [{ tag: "span[data-dss-mention]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "span",
    mergeAttributes(HTMLAttributes, { "data-dss-mention": "" }),
    `@${String(HTMLAttributes.username ?? "")}`,
  ],
});

const MediaReferenceNode = Node.create({
  name: "mediaReference",
  group: "block",
  atom: true,
  addAttributes: () => ({
    mediaId: { default: null },
    alt: { default: "" },
    caption: { default: "" },
  }),
  parseHTML: () => [{ tag: "figure[data-dss-media-id]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "figure",
    mergeAttributes(HTMLAttributes, {
      "data-dss-media-id": HTMLAttributes.mediaId,
    }),
    ["div", { class: "dss-editor-media-placeholder" }, "DSS Media"],
  ],
});

const AttachmentNode = Node.create({
  name: "attachment",
  group: "block",
  atom: true,
  addAttributes: () => ({ mediaId: { default: null }, label: { default: "" } }),
  parseHTML: () => [{ tag: "div[data-dss-attachment-id]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      "data-dss-attachment-id": HTMLAttributes.mediaId,
    }),
    `📎 ${String(HTMLAttributes.label ?? "Attachment")}`,
  ],
});

const ContentGateNode = Node.create({
  name: "contentGate",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes: () => ({ gateId: { default: null } }),
  parseHTML: () => [{ tag: "section[data-dss-content-gate]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "section",
    mergeAttributes(HTMLAttributes, { "data-dss-content-gate": "" }),
    0,
  ],
});

const CodeBlockNode = Node.create({
  name: "codeBlock",
  group: "block",
  content: "text*",
  marks: "",
  code: true,
  defining: true,
  addAttributes: () => ({ language: { default: "plaintext" } }),
  parseHTML: () => [{ tag: "pre" }],
  renderHTML: ({ HTMLAttributes }) => [
    "pre",
    { "data-language": HTMLAttributes.language },
    ["code", 0],
  ],
});

export function createEditorExtensions(profile: EditorProfile): Extensions {
  const definition = getEditorProfileDefinition(profile);
  const extensions: Extensions = [
    StarterKit.configure({
      codeBlock: false,
      heading:
        definition.headingLevels.length > 0
          ? { levels: [...definition.headingLevels] as [1, 2, 3, 4] }
          : false,
      link: {
        autolink: true,
        openOnClick: false,
        defaultProtocol: "https",
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { rel: "nofollow ugc noopener noreferrer" },
      },
    }),
    TextAlign.configure({
      types:
        definition.headingLevels.length > 0
          ? ["heading", "paragraph"]
          : ["paragraph"],
      alignments: ["left", "center"],
      defaultAlignment: "left",
    }),
    CodeBlockNode,
    MentionNode,
    MediaReferenceNode,
    AttachmentNode,
  ];

  if (definition.allowedNodes.includes("contentGate")) {
    extensions.push(ContentGateNode);
  }
  return extensions;
}

/** Tiptap supplies the engine; DSS decides which controls may leave the cockpit. */
