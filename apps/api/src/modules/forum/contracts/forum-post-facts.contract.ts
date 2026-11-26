/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum
 * 📄 File: apps/api/src/modules/forum/contracts/forum-post-facts.contract.ts
 *
 * 🎯 Purpose:
 * Minimal facts about forum posts for other modules (reputation sources):
 * who wrote a post and whether it is still available.
 *
 * ⚠️ Important:
 * Says nothing about viewer access — pair with FORUM_SUBJECT_VISIBILITY.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type ForumPostFact = Readonly<{
  authorId: string;
  /** false once the post is hidden/deleted or its topic is in the trash. */
  available: boolean;
}>;

export interface ForumPostFactsReader {
  facts(
    postIds: readonly string[],
  ): Promise<ReadonlyMap<string, ForumPostFact>>;
}

export const FORUM_POST_FACTS = Symbol('FORUM_POST_FACTS');
