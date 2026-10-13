/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Gamification Boundary Verification
 * 📄 File: apps/api/src/composition/gamification/gamification-module-boundaries.spec.ts
 *
 * 🎯 Purpose:
 * Pins minimal projections, private module providers and unchanged failure behavior.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import {
  CommunityPointsModule,
  COMMUNITY_POINTS_BALANCE_READER,
} from '@api/modules/community-points';
import { AchievementsModule } from '@api/modules/achievements';
import { LevelsModule } from '@api/modules/levels';
import { RecipientExistenceAdapter } from './infrastructure/recipient-existence.adapter';
import { LevelPointsBalanceAdapter } from './infrastructure/level-points-balance.adapter';
describe('gamification integration boundaries', () => {
  it('exports only the minimal Points read capability, not broad feature services', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, CommunityPointsModule),
    ).toEqual([COMMUNITY_POINTS_BALANCE_READER]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, AchievementsModule),
    ).toEqual([]);
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, LevelsModule)).toEqual(
      [],
    );
  });
  it('forwards scalar reads and errors without caching, expansion or fallback', async () => {
    const exists = jest
      .fn<Promise<boolean>, [string]>()
      .mockResolvedValue(false);
    const balance = jest.fn<Promise<number>, [string]>().mockResolvedValue(12);
    const recipients = new RecipientExistenceAdapter({ exists });
    const points = new LevelPointsBalanceAdapter({ balance });
    expect(await recipients.exists('subject')).toBe(false);
    expect(await points.balance('subject')).toBe(12);
    expect(exists.mock.calls).toEqual([['subject']]);
    expect(balance.mock.calls).toEqual([['subject']]);
    const failure = new Error('evidence unavailable');
    exists.mockRejectedValue(failure);
    balance.mockRejectedValue(failure);
    await expect(recipients.exists('subject')).rejects.toBe(failure);
    await expect(points.balance('subject')).rejects.toBe(failure);
  });
});
