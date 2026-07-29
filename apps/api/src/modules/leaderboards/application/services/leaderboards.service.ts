/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/application/services/leaderboards.service.ts
 *
 * 🎯 Purpose:
 * Builds bounded UTC leaderboard windows and coordinates ranking reads.
 *
 * 🧠 Responsibilities:
 * • validates pagination;
 * • converts month, year, and all-time periods into stable UTC windows;
 * • delegates read projection work without mutating gamification state.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import {
  LEADERBOARDS_REPOSITORY,
  type LeaderboardsRepository,
} from '../../domain/repositories/leaderboards.repository.interface';
import type {
  LeaderboardPage,
  LeaderboardPeriod,
  LeaderboardWindow,
} from '../../domain/types/leaderboards.type';

@Injectable()
export class LeaderboardsService {
  constructor(
    @Inject(LEADERBOARDS_REPOSITORY)
    private readonly leaderboards: LeaderboardsRepository,
  ) {}

  page(
    viewerId: string,
    period: LeaderboardPeriod = 'ALL_TIME',
    page = 1,
    limit = 20,
    now = new Date(),
  ): Promise<LeaderboardPage> {
    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException('Leaderboard page must be at least 1.');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'Leaderboard limit must contain 1..100 entries.',
      );
    }
    return this.leaderboards.page({
      viewerId,
      page,
      limit,
      ...this.window(period, now),
    });
  }

  private window(period: LeaderboardPeriod, now: Date): LeaderboardWindow {
    if (Number.isNaN(now.getTime())) {
      throw new BadRequestException('Leaderboard date is invalid.');
    }
    switch (period) {
      case 'MONTH':
        return {
          period,
          startsAt: new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
          ),
          endsAt: now,
        };
      case 'YEAR':
        return {
          period,
          startsAt: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
          endsAt: now,
        };
      case 'ALL_TIME':
        return { period, startsAt: null, endsAt: now };
      default:
        throw new BadRequestException('Leaderboard period is invalid.');
    }
  }
}

/**
 * Calendar windows use UTC. Time zones are delightful until rankings close.
 */
