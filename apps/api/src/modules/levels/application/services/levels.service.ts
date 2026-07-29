/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/application/services/levels.service.ts
 *
 * 🎯 Purpose:
 * Derives levels from Community Points and coordinates transition history.
 *
 * 🧠 Responsibilities:
 * • calculates current and next-level progress from thresholds;
 * • validates configurable monotonic level definitions;
 * • consumes Community Points events idempotently;
 * • records upward and downward transitions without storing duplicate XP.
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

import { CommunityPointsService } from '@api/modules/community-points';
import { UsersService } from '@api/modules/users';

import {
  LEVELS_REPOSITORY,
  type LevelsRepository,
} from '../../domain/repositories/levels.repository.interface';
import type {
  LevelDefinition,
  LevelEvent,
  LevelProgress,
  LevelSyncResult,
  LevelTransitionHistory,
} from '../../domain/types/levels.type';

const LEVEL_EVENT_NAMES = new Set([
  'community-points.awarded.v1',
  'community-points.reversed.v1',
]);

@Injectable()
export class LevelsService {
  constructor(
    @Inject(LEVELS_REPOSITORY)
    private readonly levels: LevelsRepository,
    private readonly points: CommunityPointsService,
    private readonly users: UsersService,
  ) {}

  definitions(): Promise<LevelDefinition[]> {
    return this.levels.definitions();
  }

  async progress(userId: string): Promise<LevelProgress> {
    if (!(await this.users.exists(userId))) {
      throw new NotFoundException('Level profile user not found.');
    }
    const [balance, definitions] = await Promise.all([
      this.points.balance(userId),
      this.levels.definitions(),
    ]);
    return this.calculate(userId, balance, definitions);
  }

  async history(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<LevelTransitionHistory> {
    if (!(await this.users.exists(userId))) {
      throw new NotFoundException('Level history user not found.');
    }
    return this.levels.history(userId, page, limit);
  }

  async updateDefinition(
    level: number,
    threshold: number,
    updatedById: string,
  ): Promise<LevelDefinition> {
    if (
      !Number.isInteger(level) ||
      level < 1 ||
      level > 1000 ||
      !Number.isInteger(threshold) ||
      threshold < 1 ||
      threshold > 2_000_000_000
    ) {
      throw new BadRequestException(
        'Level must be 1..1000 and threshold must be a positive integer.',
      );
    }
    const definition = await this.levels.updateDefinition(
      level,
      threshold,
      updatedById,
    );
    if (!definition) {
      throw new ConflictException(
        'Level thresholds must be contiguous and strictly increasing.',
      );
    }
    return definition;
  }

  async consume(job: IntegrationEventJob): Promise<LevelSyncResult> {
    if (!LEVEL_EVENT_NAMES.has(job.eventName)) {
      return { duplicate: false, transitions: [] };
    }
    const event = this.event(job);
    if (!(await this.users.exists(event.userId))) {
      throw new BadRequestException('Level event recipient does not exist.');
    }
    const [balance, definitions] = await Promise.all([
      this.points.balance(event.userId),
      this.levels.definitions(),
    ]);
    const target = this.calculate(event.userId, balance, definitions);
    return this.levels.sync(event, target.currentLevel, balance);
  }

  private calculate(
    userId: string,
    balance: number,
    definitions: LevelDefinition[],
  ): LevelProgress {
    const ordered = [...definitions].sort(
      (left, right) => left.level - right.level,
    );
    const current =
      [...ordered].reverse().find((item) => balance >= item.threshold) ?? null;
    const currentLevel = current?.level ?? 0;
    const currentThreshold = current?.threshold ?? 0;
    const next = ordered.find((item) => item.level > currentLevel) ?? null;
    const interval = next ? next.threshold - currentThreshold : 0;
    const pointsIntoLevel = Math.max(0, balance - currentThreshold);
    const progressPercent = next
      ? Math.min(100, Math.max(0, (pointsIntoLevel / interval) * 100))
      : 100;

    return {
      userId,
      balance,
      currentLevel,
      currentThreshold,
      nextLevel: next?.level ?? null,
      nextThreshold: next?.threshold ?? null,
      pointsIntoLevel,
      pointsNeeded: next ? Math.max(0, next.threshold - balance) : 0,
      progressPercent: Math.round(progressPercent * 100) / 100,
    };
  }

  private event(job: IntegrationEventJob): LevelEvent {
    if (!job.eventId || job.eventVersion < 1) {
      throw new BadRequestException('Invalid level integration event.');
    }
    if (
      typeof job.payload !== 'object' ||
      job.payload === null ||
      Array.isArray(job.payload)
    ) {
      throw new BadRequestException('Level event payload must be an object.');
    }
    const payload = job.payload as Record<string, unknown>;
    const userId =
      typeof payload.userId === 'string' ? payload.userId : undefined;
    const occurredAt = new Date(job.occurredAt);
    if (!userId || Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException(
        'Level event requires userId and a valid occurrence time.',
      );
    }
    return {
      eventId: job.eventId,
      eventName: job.eventName,
      eventVersion: job.eventVersion,
      userId,
      occurredAt,
    };
  }
}

/**
 * 🚀 Levels may go up or down. The points ledger remains mission control.
 */
