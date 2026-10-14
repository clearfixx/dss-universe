/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: packages/editor/src/projections.ts
 *
 * 🎯 Purpose:
 * Builds authored and public-only text projections from canonical documents.
 *
 * 🧠 Responsibilities:
 * • preserves the canonical text/separator and whole-document normalization rules;
 * • omits Content Gate payloads for the policy-independent public search index.
 *
 * 🏗️ Architecture:
 * Framework-neutral Editor projection; no persistence or viewer-policy dependency.
 *
 * ⚠️ Important:
 * Public search text is not a final match verdict for authenticated gated content.
 * Callers validate canonical documents before projection; authored projections stay intact.
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
  "tableCell",
  "tableHeader",
  "tableRow",
  "taskItem",
  "footnoteDefinition",
]);

export type EditorPublicSearchProjection = Readonly<{
  searchText: string;
  hasContentGates: boolean;
}>;

export function projectEditorPlainText(document: EditorDocument): string {
  return cleanPlainText(projectNode(document.content));
}

export function projectEditorSearchText(document: EditorDocument): string {
  return normalizeSearchText(projectEditorPlainText(document));
}

export function projectEditorPublicSearch(
  document: EditorDocument,
): EditorPublicSearchProjection {
  const publicProjection = { hasContentGates: false };
  const plainText = cleanPlainText(
    projectNode(document.content, publicProjection),
  );
  return {
    searchText: normalizeSearchText(plainText),
    hasContentGates: publicProjection.hasContentGates,
  };
}

function cleanPlainText(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeSearchText(text: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase("uk-UA")
    .replace(/\s+/g, " ")
    .trim();
}

function projectNode(
  node: EditorNode,
  publicProjection?: { hasContentGates: boolean },
): string {
  if (node.type === "contentGate" && publicProjection) {
    publicProjection.hasContentGates = true;
    return "\n";
  }
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "mention") return `@${stringAttr(node, "username")}`;
  if (node.type === "mediaReference") {
    return stringAttr(node, "caption") || stringAttr(node, "alt");
  }
  if (node.type === "attachment") return stringAttr(node, "label");
  if (node.type === "footnoteReference") {
    return `[${stringAttr(node, "noteId")}]`;
  }
  if (node.type === "tableOfContents") return "";

  const content = (node.content ?? [])
    .map((child) => projectNode(child, publicProjection))
    .join("");
  return BLOCK_NODES.has(node.type) ? `${content}\n` : content;
}

function stringAttr(node: EditorNode, key: string): string {
  const value = node.attrs?.[key];
  return typeof value === "string" ? value : "";
}

/** Search indexes receive meaning, not markup confetti. */
