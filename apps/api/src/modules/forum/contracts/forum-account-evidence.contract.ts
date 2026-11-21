/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/contracts/forum-account-evidence.contract.ts
 *
 * 🎯 Purpose:
 * Consumer-owned port for the account facts needed by vote eligibility.
 *
 * ⚠️ Important:
 * Root composition binds it to Auth's published account evidence; Forum never
 * reads account rows directly.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ForumAccountEvidence = { active: boolean; createdAt: Date };

export interface ForumAccountEvidenceReader {
  find(subjectId: string): Promise<ForumAccountEvidence | null>;
}

export const FORUM_ACCOUNT_EVIDENCE = Symbol('FORUM_ACCOUNT_EVIDENCE');
