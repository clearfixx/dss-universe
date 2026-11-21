/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/contracts/forum-viewer-facts.contract.ts
 *
 * 🎯 Purpose:
 * Consumer-owned port for the current audience and permission facts Forum needs.
 *
 * ⚠️ Important:
 * Authority comes from permissions and audience keys, never from role names.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ForumViewerFacts } from '../domain/types/forum-structure.type';

export interface ForumViewerFactsReader {
  read(subjectId: string | null, at: Date): Promise<ForumViewerFacts>;
}

export const FORUM_VIEWER_FACTS = Symbol('FORUM_VIEWER_FACTS');
