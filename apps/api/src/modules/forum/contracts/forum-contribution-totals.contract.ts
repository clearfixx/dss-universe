/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/contracts/forum-contribution-totals.contract.ts
 *
 * 🎯 Purpose:
 * Published counts of one member's forum contributions in a time window,
 * for community missions.
 *
 * ⚠️ Important:
 * Counts only visible posts in non-merged, non-trashed topics of public
 * sections, so private sections never leak through mission progress.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type ForumContributionTotals = {
  /** Topics the member opened in the window. */
  topics: number;
  /** Visible replies (not first posts) the member wrote in the window. */
  replies: number;
  /** The member's replies accepted as answers in the window. */
  acceptedAnswers: number;
};

export interface ForumContributionTotalsReader {
  totalsBetween(
    subjectId: string,
    since: Date,
    until: Date,
  ): Promise<ForumContributionTotals>;
}

export const FORUM_CONTRIBUTION_TOTALS = Symbol('FORUM_CONTRIBUTION_TOTALS');
