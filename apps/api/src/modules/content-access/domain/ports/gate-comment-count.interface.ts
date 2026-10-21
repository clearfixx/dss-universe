/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/domain/ports/gate-comment-count.interface.ts
 *
 * 🎯 Purpose:
 * Defines the scalar comment evidence needed by gate thresholds.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const GATE_COMMENT_COUNT = Symbol('GATE_COMMENT_COUNT');
export interface GateCommentCountReader {
  countByAuthor(authorId: string): Promise<number>;
}
