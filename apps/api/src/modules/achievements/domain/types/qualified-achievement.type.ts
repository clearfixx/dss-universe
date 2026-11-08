/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/domain/types/qualified-achievement.type.ts
 * 🎯 Purpose: Describes safe owner inputs and durable qualification progress.
 * 🧠 Responsibilities: Keeps producer facts, contribution identity and continuation explicit.
 * 🏗️ Architecture: Owner data contracts; no framework, database or foreign domain types.
 * ⚠️ Important: Root must attest these facts against canonical producer evidence before invoking the capability.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { AchievementConsumption } from './achievements.type';

export type AchievementSourceScope = {
  producer: string;
  sourceKind: string;
  sourceId: string;
};

export type QualifiedAchievementFact = AchievementSourceScope & {
  factId: string;
  canonicalEventId: string;
  revision: string;
  action: 'QUALIFY' | 'WITHDRAW';
  qualificationId: string;
  qualificationRevision: string;
  qualificationEventId: string;
  qualificationFactId: string;
  retiredThroughRevision: string;
  predecessorWithdrawalFactId: string | null;
  contractVersion: 1;
};

export type AchievementFactReference = { producer: string; factId: string };
export type VerifiedAchievementMapping = {
  awardId: string;
  qualification: AchievementFactReference;
  evidenceId: string;
  evidenceDigest: string;
};

export type QualifiedAchievementEvent = {
  eventId: string;
  eventName: string;
  eventVersion: number;
  producer: string;
  sourceType: string | null;
  sourceId: string | null;
  occurredAt: string;
  payload: Readonly<Record<string, string | number | boolean | null>>;
};

export type QualifiedAchievementCommand = {
  event: QualifiedAchievementEvent;
  facts: readonly QualifiedAchievementFact[];
  contribution: AchievementFactReference | null;
  mappings?: readonly VerifiedAchievementMapping[];
};

export type AchievementQualificationBlockCode =
  | 'INVALID_QUALIFICATION'
  | 'FACT_CONFLICT'
  | 'LEGACY_FACT_REQUIRED'
  | 'BLOCKED_LEGACY_MAPPING';

export type AchievementQualificationProgress = {
  scope: AchievementSourceScope;
  generation: string;
  sequence: string;
};

export type QualifiedAchievementOutcome =
  | {
      status: 'COMPLETE';
      consumptions: readonly AchievementConsumption[];
      examined: number;
    }
  | {
      status: 'CONTINUE';
      progress: AchievementQualificationProgress;
      examined: number;
    }
  | {
      status: 'BLOCKED';
      code: AchievementQualificationBlockCode;
      examined: number;
    };
