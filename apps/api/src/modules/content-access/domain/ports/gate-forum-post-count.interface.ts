/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/domain/ports/gate-forum-post-count.interface.ts
 *
 * 🎯 Purpose:
 * Consumer-owned port for the `FORUM_POSTS` fact supplied by Forum.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const GATE_FORUM_POST_COUNT = Symbol('GATE_FORUM_POST_COUNT');
export interface GateForumPostCountReader {
  countByAuthor(subjectId: string): Promise<number>;
}
