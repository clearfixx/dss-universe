/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: packages/editor/src/projections.ts
 *
 * 🎯 Purpose:
 * Builds plain-text and normalized search projections from canonical documents.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { EditorDocument, EditorNode } from "./document";

const BLOCK_NODES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "listItem",
  "mediaReference",
  "attachment",
  "contentGate",
]);

export function projectEditorPlainText(document: EditorDocument): string {
  return projectNode(document.content)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function projectEditorSearchText(document: EditorDocument): string {
  return projectEditorPlainText(document)
    .normalize("NFKC")
    .toLocaleLowerCase("uk-UA")
    .replace(/\s+/g, " ")
    .trim();
}

function projectNode(node: EditorNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "mention") return `@${stringAttr(node, "username")}`;
  if (node.type === "mediaReference") {
    return stringAttr(node, "caption") || stringAttr(node, "alt");
  }
  if (node.type === "attachment") return stringAttr(node, "label");

  const content = (node.content ?? []).map(projectNode).join("");
  return BLOCK_NODES.has(node.type) ? `${content}\n` : content;
}

function stringAttr(node: EditorNode, key: string): string {
  const value = node.attrs?.[key];
  return typeof value === "string" ? value : "";
}

/** Search indexes receive meaning, not markup confetti. */
