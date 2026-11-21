/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: packages/editor/src/media-references.ts
 *
 * 🎯 Purpose:
 * Pure extraction of Media IDs referenced by a validated Editor document.
 *
 * 🧠 Responsibilities:
 * • walks the whole tree, Content Gate payloads included (a gated file is
 *   still referenced by its owner);
 * • lets each owner choose which media node types it claims.
 *
 * ⚠️ Important:
 * Call only with documents that passed `validateEditorDocument`; this function
 * neither validates nor authorizes. Attach permission belongs to Media and
 * reference lifetime to the owning module.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { EditorDocument, EditorNode } from "./document";

export const EDITOR_MEDIA_NODE_TYPES = [
  "mediaReference",
  "attachment",
] as const;
export type EditorMediaNodeType = (typeof EDITOR_MEDIA_NODE_TYPES)[number];

/** Unique `mediaId`s in document order (first occurrence wins). */
export function collectEditorMediaIds(
  document: EditorDocument,
  nodeTypes: readonly EditorMediaNodeType[] = EDITOR_MEDIA_NODE_TYPES,
): string[] {
  const wanted = new Set<string>(nodeTypes);
  const ids = new Set<string>();
  const visit = (node: EditorNode): void => {
    if (wanted.has(node.type)) {
      const mediaId = node.attrs?.mediaId;
      if (typeof mediaId === "string") ids.add(mediaId);
    }
    node.content?.forEach(visit);
  };
  visit(document.content);
  return [...ids];
}
