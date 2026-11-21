/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/contracts/forum-subject-visibility.contract.ts
 *
 * 🎯 Purpose:
 * Answers, at read time, which forum topics and posts a viewer may see now.
 *
 * ⚠️ Important:
 * Category visibility, trash, merges, inactive forums and hidden/deleted posts
 * are evaluated against current state, so stale projections never leak.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ForumSubjectRef = Readonly<{
  subjectType: 'ForumTopic' | 'ForumPost';
  subjectId: string;
}>;

export interface ForumSubjectVisibility {
  /** Returns `${subjectType}:${subjectId}` keys visible to the viewer. */
  visibleSubjects(
    viewerId: string | null,
    subjects: readonly ForumSubjectRef[],
  ): Promise<ReadonlySet<string>>;
}

export const FORUM_SUBJECT_VISIBILITY = Symbol('FORUM_SUBJECT_VISIBILITY');
