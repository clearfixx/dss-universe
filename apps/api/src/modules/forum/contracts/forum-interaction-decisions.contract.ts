/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/contracts/forum-interaction-decisions.contract.ts
 *
 * 🎯 Purpose:
 * Publishes Forum's owner decisions for `forum.topic` Interaction Targets.
 *
 * ⚠️ Important:
 * READ follows category visibility; REACT (votes, poll ballots) requires an
 * OPEN topic; COMMENT is always denied because forum replies are posts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const FORUM_TOPIC_INTERACTION_KIND = 'forum.topic';

export interface ForumInteractionDecisions {
  permits(
    topicId: string,
    targetId: string,
    viewerId: string | null,
    capability: 'READ' | 'COMMENT' | 'REACT' | 'BOOKMARK' | 'SHARE',
  ): Promise<boolean>;
}

export const FORUM_INTERACTION_DECISIONS = Symbol(
  'FORUM_INTERACTION_DECISIONS',
);
