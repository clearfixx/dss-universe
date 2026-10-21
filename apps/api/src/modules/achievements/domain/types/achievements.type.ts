/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/domain/types/achievements.type.ts
 *
 * 🎯 Purpose:
 * Defines achievement definitions, event rules, awards, and revocations.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type AchievementDefinition = {
  id: string;
  key: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  badge: string;
  isActive: boolean;
  createdById: string;
  updatedById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AchievementRule = {
  id: string;
  achievementId: string;
  eventName: string;
  recipientPayloadKey: string;
  repeatable: boolean;
  cooldownHours: number;
  dailyCap: number | null;
  enabled: boolean;
  createdById: string;
  updatedById: string;
  createdAt: Date;
  updatedAt: Date;
  achievement: AchievementDefinition;
};

export type AchievementAwardKind = 'RULE' | 'MANUAL';

export type AchievementAward = {
  id: string;
  userId: string;
  achievementId: string;
  ruleId: string | null;
  kind: AchievementAwardKind;
  reason: string;
  awardedById: string | null;
  sourceEventId: string | null;
  sourceEventName: string | null;
  sourceType: string | null;
  sourceId: string | null;
  awardedAt: Date;
  achievement: AchievementDefinition;
  revocation: AchievementAwardRevocation | null;
};

export type AchievementAwardRevocation = {
  id: string;
  awardId: string;
  revokedById: string | null;
  reason: string;
  occurredAt: Date;
};

export type AchievementEvent = {
  eventId: string;
  eventName: string;
  eventVersion: number;
  payload: Record<string, unknown>;
  sourceType: string | null;
  sourceId: string | null;
  occurredAt: Date;
};

export type AchievementConsumption = {
  ruleId: string;
  status: 'AWARDED' | 'DUPLICATE' | 'IGNORED' | 'CAPPED';
  award: AchievementAward | null;
};

export type AchievementWriteResult<T> =
  | { status: 'OK'; value: T }
  | { status: 'NOT_FOUND' | 'CONFLICT'; value: null };

export type AchievementAwardResult =
  | { status: 'OK'; award: AchievementAward }
  | {
      status: 'USER_NOT_FOUND' | 'ACHIEVEMENT_NOT_FOUND' | 'CONFLICT';
      award: null;
    };

export type AchievementRevokeResult =
  | { status: 'OK'; award: AchievementAward }
  | { status: 'NOT_FOUND' | 'ALREADY_REVOKED'; award: null };

/**
 * Badges record milestones. Permissions remain in Authorization Core.
 */
