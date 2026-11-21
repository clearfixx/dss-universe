/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/contracts/forum-topic-counts.contract.ts
 *
 * 🎯 Purpose:
 * Publishes the `FORUM_POSTS` Content Gate fact: topics a member created in
 * public forums (owner decision: topics only, public forums only).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface ForumTopicCounts {
  countPublicTopicsByAuthor(subjectId: string): Promise<number>;
}

export const FORUM_TOPIC_COUNTS = Symbol('FORUM_TOPIC_COUNTS');
