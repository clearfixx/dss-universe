/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/contracts/forum-member-cards.contract.ts
 *
 * 🎯 Purpose:
 * Forum's consumer-owned port for the public identity shown next to topics,
 * posts and votes (name, username, avatar, join date), bound in root
 * composition.
 *
 * ⚠️ Important:
 * Batch only: callers pass every ID of one response at once. Never returns
 * e-mail, roles or other private profile data.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ForumMemberCard = Readonly<{
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  /** Account creation time, shown as "На сайті з …". */
  createdAt: Date;
}>;

export interface ForumMemberCardReader {
  cards(ids: readonly string[]): Promise<readonly ForumMemberCard[]>;
}

export const FORUM_MEMBER_CARDS = Symbol('FORUM_MEMBER_CARDS');
