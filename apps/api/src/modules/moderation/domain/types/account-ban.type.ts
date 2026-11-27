/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/domain/types/account-ban.type.ts
 *
 * 🎯 Purpose:
 * Facts of a permanent ban.
 *
 * ⚠️ Important:
 * A ban is issued once and lifted at most once.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type AccountBanRecord = {
  id: string;
  reference: string;
  subjectId: string;
  issuerId: string;
  ruleCode: string;
  ruleText: string;
  comment: string;
  contextPath: string | null;
  issuedAt: Date;
  liftedAt: Date | null;
  liftedById: string | null;
  liftReason: string | null;
};

export type NewAccountBan = {
  reference: string;
  subjectId: string;
  issuerId: string;
  ruleId: string;
  ruleCode: string;
  ruleText: string;
  comment: string;
  context: { type: string; id: string; path: string | null } | null;
  issuedAt: Date;
};
