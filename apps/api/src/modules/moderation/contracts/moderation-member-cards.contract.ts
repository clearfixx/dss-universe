/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/contracts/moderation-member-cards.contract.ts
 *
 * 🎯 Purpose:
 * Moderation's consumer-owned port for the public identity shown in the
 * staff sanctions journal (sanctioned member and issuer), bound in root
 * composition.
 *
 * ⚠️ Important:
 * Batch only. Never returns e-mail, roles or other private profile data.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ModerationMemberCard = Readonly<{
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}>;

export interface ModerationMemberCardReader {
  cards(ids: readonly string[]): Promise<readonly ModerationMemberCard[]>;
}

export const MODERATION_MEMBER_CARDS = Symbol('MODERATION_MEMBER_CARDS');
