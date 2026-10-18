/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboard Read Composition
 * 📄 File: apps/api/src/composition/leaderboards/infrastructure/leaderboard-ownership.spec.ts
 *
 * 🎯 Purpose:
 * Verifies unchanged SQL fingerprints, bindings, owned fragments and safe ranking facts.
 *
 * ⚠️ Important:
 * Tests real fragment assembly; provider failures propagate, no independent count or transaction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaLeaderboardRankingReader } from './prisma-leaderboard-ranking.reader';
import { RankingFactsLeaderboardsRepository } from '../../../modules/leaderboards/infrastructure/repositories/ranking-facts-leaderboards.repository';
import type {
  LeaderboardQuery,
  LeaderboardRankingFact,
  LeaderboardRankingFacts,
} from '@api/modules/leaderboards';

const endsAt = new Date('2026-10-16T00:00:00Z');
const startsAt = new Date('2026-10-01T00:00:00Z');
const query: LeaderboardQuery = {
  period: 'MONTH',
  startsAt,
  endsAt,
  page: 2,
  limit: 2,
  viewerId: 'viewer',
};
const fact: LeaderboardRankingFact = {
  rank: 3,
  total: 8,
  userId: 'viewer',
  username: 'public',
  displayName: null,
  avatarUrl: null,
  communityPoints: -2,
  reputation: -3,
  currentLevel: null,
  titleName: null,
  titleColor: null,
  titleBadge: null,
};
describe('Leaderboard owned statement', () => {
  function setup(rows: unknown[] = []) {
    const execute = jest.fn().mockResolvedValue(rows);
    const prisma = {
      $queryRaw: execute,
      $transaction: jest.fn(),
      user: { findMany: jest.fn() },
    };
    return {
      execute,
      prisma,
      reader: new PrismaLeaderboardRankingReader(prisma),
    };
  }
  it.each([
    [
      startsAt,
      'f80d18c4d5e8aaa1394bd1932ee37bfcb8ad2d30ca6ba44450c45e7740e8f1f5',
    ],
    [null, '1b00c7d997dc49d54f498de251ba39c61a45fb85364eb87e0dbb57002d8acc21'],
  ])(
    'preserves original normalized SQL and exact bindings for lower bound %s',
    async (lower, fingerprint) => {
      const { reader, execute, prisma } = setup();
      await expect(
        reader.read({ ...query, startsAt: lower }, 3, 4),
      ).resolves.toEqual([]);
      expect(execute).toHaveBeenCalledTimes(1);
      const call = execute.mock.calls[0] as unknown[];
      const statement = call[0] as Prisma.Sql;
      expect(
        createHash('sha256')
          .update(statement.text.replace(/\s+/g, ' ').trim())
          .digest('hex'),
      ).toBe(fingerprint);
      expect(statement.values).toEqual(
        lower
          ? [endsAt, lower, endsAt, endsAt, 3, 4, 'viewer']
          : [endsAt, endsAt, endsAt, 3, 4, 'viewer'],
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    },
  );
  it('normalizes numbers and returns only immutable-contract allowlisted fields', async () => {
    const row = {
      ...fact,
      rank: 3n,
      total: 8n,
      communityPoints: -2n,
      reputation: -3n,
      allTimePoints: 999n,
      passwordHash: 'must-not-leak',
      status: 'ACTIVE',
    };
    const { reader } = setup([row]);
    expect(await reader.read(query, 3, 4)).toEqual([fact]);
  });
  it('propagates provider failure without retries, empty fallback or extra reads', async () => {
    const { reader, execute } = setup();
    const failure = new Error('synthetic provider failure');
    execute.mockRejectedValue(failure);
    await expect(reader.read(query, 3, 4)).rejects.toBe(failure);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
describe('Leaderboard fact interpretation', () => {
  function setup(rows: readonly LeaderboardRankingFact[]) {
    const read = jest
      .fn<
        ReturnType<LeaderboardRankingFacts['read']>,
        Parameters<LeaderboardRankingFacts['read']>
      >()
      .mockResolvedValue(rows);
    return {
      read,
      repository: new RankingFactsLeaderboardsRepository({ read }),
    };
  }
  it('preserves page bounds, viewer outside page, numeric signs and missing level/title', async () => {
    const { read, repository } = setup([
      { ...fact, rank: 1 },
      { ...fact, userId: 'other', rank: 3 },
      { ...fact, userId: 'last', rank: 4 },
      { ...fact, userId: 'after', rank: 5 },
    ]);
    const result = await repository.page(query);
    expect(read).toHaveBeenCalledWith(query, 3, 4);
    expect(result.items.map((row) => row.userId)).toEqual(['other', 'last']);
    expect(result.items[0]).toEqual({
      rank: 3,
      userId: 'other',
      username: 'public',
      displayName: null,
      avatarUrl: null,
      communityPoints: -2,
      reputation: -3,
      currentLevel: 0,
      selectedTitle: null,
    });
    expect(result).toMatchObject({
      total: 8,
      totalPages: 4,
      viewerRank: 1,
      viewerCommunityPoints: -2,
      generatedAt: endsAt,
      startsAt,
      endsAt,
    });
  });
  it('preserves empty-page legacy DEBT-060 and absent viewer', async () => {
    const { repository } = setup([]);
    expect(await repository.page(query)).toMatchObject({
      items: [],
      total: 0,
      totalPages: 0,
      viewerRank: null,
      viewerCommunityPoints: null,
    });
  });
  it.each([
    [null, 'blue', 'badge', null],
    ['name', null, 'badge', null],
    ['name', 'blue', null, null],
    ['', 'blue', 'badge', null],
    ['name', 'blue', 'badge', { name: 'name', color: 'blue', badge: 'badge' }],
  ])(
    'preserves selected-title truthiness %s/%s/%s',
    async (titleName, titleColor, titleBadge, expected) => {
      const { repository } = setup([
        { ...fact, currentLevel: 7, titleName, titleColor, titleBadge },
      ]);
      const result = await repository.page(query);
      expect(result.items[0].selectedTitle).toEqual(expected);
      expect(result.items[0].currentLevel).toBe(7);
    },
  );
  it('propagates failed ranking evidence without a fabricated page', async () => {
    const { read, repository } = setup([]);
    const failure = new Error('synthetic fact failure');
    read.mockRejectedValue(failure);
    await expect(repository.page(query)).rejects.toBe(failure);
  });
});
