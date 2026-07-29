/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/application/services/community-points.service.ts
 *
 * 🎯 Purpose:
 * Converts approved integration events into idempotent Community Points.
 *
 * 🧠 Responsibilities:
 * • resolves configurable event rules and recipients;
 * • enforces event payload and user validity;
 * • delegates caps and idempotency to the transactional repository;
 * • appends compensating reversals without rewriting history.
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
  COMMUNITY_POINTS_REPOSITORY,
  type CommunityPointsRepository,
} from '../../domain/repositories/community-points.repository.interface';
import type {
  CommunityPointConsumption,
  CommunityPointEntry,
  CommunityPointEvent,
  CommunityPointHistory,
  CommunityPointRule,
} from '../../domain/types/community-points.type';

const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 500;

@Injectable()
export class CommunityPointsService {
  constructor(
    @Inject(COMMUNITY_POINTS_REPOSITORY)
    private readonly points: CommunityPointsRepository,
    private readonly users: UsersService,
  ) {}

  balance(userId: string): Promise<number> {
    return this.points.balance(userId);
  }

  rules(): Promise<CommunityPointRule[]> {
    return this.points.rules();
  }

  async updateRule(
    key: string,
    points: number,
    dailyLimit: number | null,
    enabled: boolean,
    updatedById: string,
  ): Promise<CommunityPointRule> {
    if (
      !Number.isInteger(points) ||
      points === 0 ||
      Math.abs(points) > 10_000
    ) {
      throw new BadRequestException(
        'Community Points weight must be a non-zero integer between -10000 and 10000.',
      );
    }
    if (
      dailyLimit !== null &&
      (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 10_000)
    ) {
      throw new BadRequestException(
        'Daily limit must be null or an integer between 1 and 10000.',
      );
    }
    const rule = await this.points.updateRule(
      key,
      points,
      dailyLimit,
      enabled,
      updatedById,
    );
    if (!rule) throw new NotFoundException('Community Points rule not found.');
    return rule;
  }

  async consume(job: IntegrationEventJob): Promise<CommunityPointConsumption> {
    const event = this.event(job);
    if (event.eventName === 'reputation.direct.reversed.v1') {
      return this.consumeReputationReversal(event);
    }
    const payloadValue = this.optionalInteger(event.payload.value);
    const rules = await this.points.matchingRules(
      event.eventName,
      payloadValue,
    );
    if (rules.length === 0) return { status: 'IGNORED', entry: null };

    const userId = this.recipient(event.payload);
    if (!userId || !(await this.users.exists(userId))) {
      throw new BadRequestException(
        'Community Points event has no valid recipient.',
      );
    }

    for (const rule of rules) {
      const result = await this.points.award({
        event,
        userId,
        rule,
        reason: this.eventReason(rule.key),
      });
      if (result.status !== 'IGNORED') return result;
    }
    return { status: 'IGNORED', entry: null };
  }

  async reverse(
    entryId: string,
    actorId: string,
    reason: string,
  ): Promise<CommunityPointEntry> {
    const original = await this.points.findOriginalById(entryId);
    if (!original)
      throw new NotFoundException('Community Points entry not found.');
    if (original.reversal) {
      throw new ConflictException(
        'Community Points entry is already reversed.',
      );
    }
    const reversal = await this.points.reverse(
      entryId,
      actorId,
      this.reason(reason),
      new Date(),
    );
    if (!reversal) {
      throw new ConflictException(
        'Community Points entry is already reversed.',
      );
    }
    return reversal;
  }

  async history(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<CommunityPointHistory> {
    if (!(await this.users.exists(userId))) {
      throw new NotFoundException('Community Points recipient not found.');
    }
    return this.points.history(userId, page, limit);
  }

  private async consumeReputationReversal(
    event: CommunityPointEvent,
  ): Promise<CommunityPointConsumption> {
    const sourceId = this.optionalString(event.payload.reversesEntryId);
    if (!sourceId) {
      throw new BadRequestException(
        'Reputation reversal event has no original entry reference.',
      );
    }
    const result = await this.points.reverseSource(
      'ReputationEntry',
      sourceId,
      event.eventId,
      event.actorId,
      'Source reputation decision was reversed.',
      event.occurredAt,
    );
    return {
      status: result.duplicate ? 'DUPLICATE' : 'AWARDED',
      entry: result.entries[0] ?? null,
    };
  }

  private event(job: IntegrationEventJob): CommunityPointEvent {
    if (!job.eventId || job.eventVersion < 1 || !job.eventName) {
      throw new BadRequestException('Invalid Community Points event.');
    }
    if (
      typeof job.payload !== 'object' ||
      job.payload === null ||
      Array.isArray(job.payload)
    ) {
      throw new BadRequestException(
        'Community Points event payload must be an object.',
      );
    }
    const occurredAt = new Date(job.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('Invalid event occurrence time.');
    }
    return {
      eventId: job.eventId,
      eventName: job.eventName,
      eventVersion: job.eventVersion,
      occurredAt,
      payload: job.payload as Record<string, unknown>,
      ...(job.actorId ? { actorId: job.actorId } : {}),
      ...(job.aggregateType ? { aggregateType: job.aggregateType } : {}),
      ...(job.aggregateId ? { aggregateId: job.aggregateId } : {}),
    };
  }

  private recipient(payload: Record<string, unknown>): string | undefined {
    return (
      this.optionalString(payload.userId) ??
      this.optionalString(payload.authorId) ??
      this.optionalString(payload.recipientId)
    );
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private optionalInteger(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isInteger(value)
      ? value
      : undefined;
  }

  private reason(value: string): string {
    const reason = value.trim();
    if (
      reason.length < MIN_REASON_LENGTH ||
      reason.length > MAX_REASON_LENGTH
    ) {
      throw new BadRequestException(
        `Reason must contain ${MIN_REASON_LENGTH} to ${MAX_REASON_LENGTH} characters.`,
      );
    }
    return reason;
  }

  private eventReason(ruleKey: string): string {
    return `Community activity reward: ${ruleKey}.`;
  }
}

/**
 * 🛰️ Events report activity; rules translate it. No controller invents points.
 */
