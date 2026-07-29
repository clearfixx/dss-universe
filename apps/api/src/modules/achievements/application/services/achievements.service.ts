/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/application/services/achievements.service.ts
 *
 * 🎯 Purpose:
 * Coordinates event-driven and manual achievement lifecycle.
 *
 * 🧠 Responsibilities:
 * • validates definitions, rules, reasons, and event payloads;
 * • routes semantic events to matching idempotent rules;
 * • supports manual awards and source-aware moderation rollback;
 * • keeps achievements separate from authorization and custom titles.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IntegrationEventJob } from '@dss/jobs';

import { UsersService } from '@api/modules/users';

import {
  ACHIEVEMENTS_REPOSITORY,
  type AchievementDefinitionWrite,
  type AchievementRuleWrite,
  type AchievementsRepository,
} from '../../domain/repositories/achievements.repository.interface';
import type {
  AchievementAward,
  AchievementConsumption,
  AchievementDefinition,
  AchievementRule,
} from '../../domain/types/achievements.type';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const KEY = /^[a-z0-9]+([._-][a-z0-9]+)*$/;
const EVENT_NAME = /^[a-z0-9]+([.-][a-z0-9]+)*\.v[1-9][0-9]*$/;
const PAYLOAD_KEY = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

export type AchievementDefinitionDraft = {
  id?: string;
  key: string;
  name: string;
  description?: string | null;
  color: string;
  badge: string;
  isActive?: boolean;
};

export type AchievementRuleDraft = {
  id?: string;
  achievementId: string;
  eventName: string;
  recipientPayloadKey: string;
  repeatable: boolean;
  cooldownHours: number;
  dailyCap?: number | null;
  enabled: boolean;
};

@Injectable()
export class AchievementsService {
  constructor(
    @Inject(ACHIEVEMENTS_REPOSITORY)
    private readonly achievements: AchievementsRepository,
    private readonly users: UsersService,
  ) {}

  definitions(includeInactive = false): Promise<AchievementDefinition[]> {
    return this.achievements.definitions(includeInactive);
  }

  rules(includeDisabled = false): Promise<AchievementRule[]> {
    return this.achievements.rules(includeDisabled);
  }

  awards(userId: string, includeRevoked = false): Promise<AchievementAward[]> {
    this.required(userId, 'User id');
    return this.achievements.awards(userId, includeRevoked);
  }

  async writeDefinition(
    draft: AchievementDefinitionDraft,
    actorId: string,
  ): Promise<AchievementDefinition> {
    const input = this.definitionInput(draft, actorId);
    const result = await this.achievements.writeDefinition(input);
    if (result.status === 'NOT_FOUND') {
      throw new NotFoundException('Achievement definition not found.');
    }
    if (result.status === 'CONFLICT') {
      throw new ConflictException(
        'Achievement key, name, or slug is already in use.',
      );
    }
    if (result.status !== 'OK') {
      throw new ConflictException('Achievement could not be saved.');
    }
    return result.value;
  }

  async writeRule(
    draft: AchievementRuleDraft,
    actorId: string,
  ): Promise<AchievementRule> {
    const input = this.ruleInput(draft, actorId);
    const result = await this.achievements.writeRule(input);
    if (result.status === 'NOT_FOUND') {
      throw new NotFoundException('Achievement or rule not found.');
    }
    if (result.status === 'CONFLICT') {
      throw new ConflictException(
        'This achievement already listens to the event.',
      );
    }
    if (result.status !== 'OK') {
      throw new ConflictException('Achievement rule could not be saved.');
    }
    return result.value;
  }

  async consume(job: IntegrationEventJob): Promise<AchievementConsumption[]> {
    const event = this.event(job);
    const rollback = this.rollbackCoordinates(event.payload);
    if (rollback) {
      const awards = await this.achievements.rollbackSource(
        rollback.sourceType,
        rollback.sourceId,
        `Source rollback from ${event.eventName}.`,
        null,
      );
      return awards.map((award) => ({
        ruleId: award.ruleId ?? 'manual',
        status: 'IGNORED',
        award,
      }));
    }
    const rules = await this.achievements.matchingRules(event.eventName);
    const results: AchievementConsumption[] = [];
    for (const rule of rules) {
      const recipient = event.payload[rule.recipientPayloadKey];
      if (typeof recipient !== 'string' || !recipient) {
        throw new BadRequestException(
          `Achievement event requires string payload.${rule.recipientPayloadKey}.`,
        );
      }
      if (!(await this.users.exists(recipient))) {
        throw new BadRequestException('Achievement event user does not exist.');
      }
      results.push(await this.achievements.consume(rule, event, recipient));
    }
    return results;
  }

  async manualAward(
    userId: string,
    achievementId: string,
    reason: string,
    actorId: string,
  ): Promise<AchievementAward> {
    this.required(userId, 'User id');
    this.required(achievementId, 'Achievement id');
    const result = await this.achievements.manualAward(
      userId,
      achievementId,
      this.reason(reason),
      actorId,
    );
    if (result.status === 'USER_NOT_FOUND') {
      throw new NotFoundException('Achievement recipient not found.');
    }
    if (result.status === 'ACHIEVEMENT_NOT_FOUND') {
      throw new NotFoundException('Active achievement not found.');
    }
    if (result.status === 'CONFLICT') {
      throw new ConflictException('User already has this achievement.');
    }
    if (result.status !== 'OK') {
      throw new ConflictException('Achievement could not be awarded.');
    }
    return result.award;
  }

  async revoke(
    awardId: string,
    reason: string,
    actorId: string,
  ): Promise<AchievementAward> {
    this.required(awardId, 'Award id');
    const result = await this.achievements.revoke(
      awardId,
      this.reason(reason),
      actorId,
    );
    if (result.status === 'NOT_FOUND') {
      throw new NotFoundException('Achievement award not found.');
    }
    if (result.status === 'ALREADY_REVOKED') {
      throw new ConflictException('Achievement award is already revoked.');
    }
    if (result.status !== 'OK') {
      throw new ConflictException('Achievement award could not be revoked.');
    }
    return result.award;
  }

  rollbackSource(
    sourceType: string,
    sourceId: string,
    reason: string,
    actorId: string,
  ): Promise<AchievementAward[]> {
    this.required(sourceType, 'Source type');
    this.required(sourceId, 'Source id');
    return this.achievements.rollbackSource(
      sourceType,
      sourceId,
      this.reason(reason),
      actorId,
    );
  }

  private definitionInput(
    draft: AchievementDefinitionDraft,
    actorId: string,
  ): AchievementDefinitionWrite {
    const key = draft.key.trim().toLowerCase();
    const name = draft.name.trim();
    const badge = draft.badge.trim();
    const description = draft.description?.trim() || null;
    if (!KEY.test(key) || key.length > 80) {
      throw new BadRequestException('Achievement key format is invalid.');
    }
    if (name.length < 2 || name.length > 80) {
      throw new BadRequestException(
        'Achievement name must contain 2..80 characters.',
      );
    }
    if (!HEX_COLOR.test(draft.color)) {
      throw new BadRequestException(
        'Achievement color must be a six-digit hex color.',
      );
    }
    if (badge.length < 1 || badge.length > 64) {
      throw new BadRequestException(
        'Achievement badge must contain 1..64 characters.',
      );
    }
    if (description && description.length > 500) {
      throw new BadRequestException(
        'Achievement description must not exceed 500 characters.',
      );
    }
    return {
      ...(draft.id ? { id: draft.id } : {}),
      key,
      name,
      slug: this.slug(name),
      description,
      color: draft.color.toUpperCase(),
      badge,
      isActive: draft.isActive ?? true,
      actorId,
    };
  }

  private ruleInput(
    draft: AchievementRuleDraft,
    actorId: string,
  ): AchievementRuleWrite {
    if (
      !EVENT_NAME.test(draft.eventName) ||
      !PAYLOAD_KEY.test(draft.recipientPayloadKey) ||
      !Number.isInteger(draft.cooldownHours) ||
      draft.cooldownHours < 0 ||
      draft.cooldownHours > 87_600 ||
      (draft.dailyCap !== null &&
        draft.dailyCap !== undefined &&
        (!Number.isInteger(draft.dailyCap) ||
          draft.dailyCap < 1 ||
          draft.dailyCap > 1000))
    ) {
      throw new BadRequestException('Achievement rule policy is invalid.');
    }
    return {
      ...(draft.id ? { id: draft.id } : {}),
      achievementId: draft.achievementId,
      eventName: draft.eventName,
      recipientPayloadKey: draft.recipientPayloadKey,
      repeatable: draft.repeatable,
      cooldownHours: draft.cooldownHours,
      dailyCap: draft.dailyCap ?? null,
      enabled: draft.enabled,
      actorId,
    };
  }

  private event(job: IntegrationEventJob) {
    if (
      !job.eventId ||
      !EVENT_NAME.test(job.eventName) ||
      job.eventVersion < 1 ||
      typeof job.payload !== 'object' ||
      job.payload === null ||
      Array.isArray(job.payload)
    ) {
      throw new BadRequestException('Invalid achievement integration event.');
    }
    const occurredAt = new Date(job.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('Achievement event time is invalid.');
    }
    return {
      eventId: job.eventId,
      eventName: job.eventName,
      eventVersion: job.eventVersion,
      payload: job.payload as Record<string, unknown>,
      sourceType: job.aggregateType ?? null,
      sourceId: job.aggregateId ?? null,
      occurredAt,
    };
  }

  private rollbackCoordinates(payload: Record<string, unknown>) {
    const sourceType = payload.reversedSourceType;
    const sourceId = payload.reversedSourceId;
    return typeof sourceType === 'string' && typeof sourceId === 'string'
      ? { sourceType, sourceId }
      : null;
  }

  private reason(value: string): string {
    const reason = value.trim();
    if (reason.length < 3 || reason.length > 500) {
      throw new BadRequestException('Reason must contain 3..500 characters.');
    }
    return reason;
  }

  private required(value: string, label: string): void {
    if (!value.trim()) throw new BadRequestException(`${label} is required.`);
  }

  private slug(name: string): string {
    const slug = name
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);
    if (!slug) {
      throw new BadRequestException('Achievement name cannot form a slug.');
    }
    return slug;
  }
}

/**
 * 🏅 The event earns the badge. The badge still cannot operate the airlock.
 */
