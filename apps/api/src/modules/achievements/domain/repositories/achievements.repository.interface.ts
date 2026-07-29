/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/domain/repositories/achievements.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines persistence boundaries for definitions, rules, awards, and rollback.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  AchievementAward,
  AchievementAwardResult,
  AchievementConsumption,
  AchievementDefinition,
  AchievementEvent,
  AchievementRevokeResult,
  AchievementRule,
  AchievementWriteResult,
} from '../types/achievements.type';

export const ACHIEVEMENTS_REPOSITORY = Symbol('ACHIEVEMENTS_REPOSITORY');

export type AchievementDefinitionWrite = Pick<
  AchievementDefinition,
  'key' | 'name' | 'slug' | 'description' | 'color' | 'badge' | 'isActive'
> & {
  id?: string;
  actorId: string;
};

export type AchievementRuleWrite = Pick<
  AchievementRule,
  | 'achievementId'
  | 'eventName'
  | 'recipientPayloadKey'
  | 'repeatable'
  | 'cooldownHours'
  | 'dailyCap'
  | 'enabled'
> & {
  id?: string;
  actorId: string;
};

export interface AchievementsRepository {
  definitions(includeInactive: boolean): Promise<AchievementDefinition[]>;
  writeDefinition(
    input: AchievementDefinitionWrite,
  ): Promise<AchievementWriteResult<AchievementDefinition>>;
  rules(includeDisabled: boolean): Promise<AchievementRule[]>;
  writeRule(
    input: AchievementRuleWrite,
  ): Promise<AchievementWriteResult<AchievementRule>>;
  matchingRules(eventName: string): Promise<AchievementRule[]>;
  consume(
    rule: AchievementRule,
    event: AchievementEvent,
    userId: string,
  ): Promise<AchievementConsumption>;
  manualAward(
    userId: string,
    achievementId: string,
    reason: string,
    actorId: string,
  ): Promise<AchievementAwardResult>;
  revoke(
    awardId: string,
    reason: string,
    actorId: string | null,
  ): Promise<AchievementRevokeResult>;
  rollbackSource(
    sourceType: string,
    sourceId: string,
    reason: string,
    actorId: string | null,
  ): Promise<AchievementAward[]>;
  awards(userId: string, includeRevoked: boolean): Promise<AchievementAward[]>;
}

/**
 * The repository can revoke an award. It cannot delete achievement history.
 */
