/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/domain/types/moderation-sanction.type.ts
 *
 * 🎯 Purpose:
 * Defines owner-local sanction, policy and journal vocabulary.
 *
 * ⚠️ Important:
 * These types are not Prisma or GraphQL representations.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const MODERATION_SANCTION_KINDS = ['WARNING', 'READ_ONLY'] as const;
export type ModerationSanctionKind = (typeof MODERATION_SANCTION_KINDS)[number];

export const MODERATION_SANCTION_ORIGINS = [
  'MANUAL',
  'SCOPED',
  'ESCALATION',
] as const;
export type ModerationSanctionOrigin =
  (typeof MODERATION_SANCTION_ORIGINS)[number];

export type ModerationSanctionPolicy = {
  warningLifetimeDays: number;
  escalationWarningCount: number;
  escalationReadOnlyDays: number;
  readOnlyMaxDays: number;
};

export type ModerationSanctionContext = {
  type: string;
  id: string;
  path: string | null;
};

export type ModerationSanctionRecord = {
  id: string;
  subjectId: string;
  kind: ModerationSanctionKind;
  origin: ModerationSanctionOrigin;
  issuerId: string | null;
  reason: string;
  context: ModerationSanctionContext | null;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedById: string | null;
  revokeReason: string | null;
  consumedAt: Date | null;
  consumedBySanctionId: string | null;
};

export type ModerationSanctionStatus = {
  readOnlyUntil: Date | null;
  activeWarnings: number;
};

export type ModerationJournalPage = {
  items: ModerationSanctionRecord[];
  total: number;
  page: number;
  limit: number;
};
