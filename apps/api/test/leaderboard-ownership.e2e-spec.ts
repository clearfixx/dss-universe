/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboard Ownership Characterization
 * 📄 File: apps/api/test/leaderboard-ownership.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Pins the existing multi-owner ranking query before persistence ownership transfer.
 *
 * 🧠 Responsibilities:
 * • verifies ordering, signed windows, eligibility, enrichment and viewer pagination;
 * • records one-statement work and existing edge behavior without silently fixing it.
 *
 * 🏗️ Architecture:
 * Production repository against a fresh fully migrated owned schema for every case.
 *
 * ⚠️ Important:
 * Immutable ledger protections stay enabled; only fixture-owned schemas are dropped.
 * No scoring, status policy or transaction changes belong to characterization.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createHash, randomUUID } from 'node:crypto';
import { PrismaLeaderboardsRepository } from '../src/modules/leaderboards/infrastructure/repositories/prisma-leaderboards.repository';
import type { LeaderboardQuery } from '../src/modules/leaderboards/domain/types/leaderboards.type';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

const start = new Date('2026-10-01T00:00:00.000Z');
const end = new Date('2026-10-16T00:00:00.000Z');
const states = ['ACTIVE', 'DEACTIVATED', 'BANNED', 'DELETED'] as const;
describe('Leaderboard ownership characterization (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let repository: PrismaLeaderboardsRepository;
  beforeEach(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    repository = new PrismaLeaderboardsRepository(fixture.prisma);
  }, 60000);
  afterEach(async () => {
    await fixture?.close();
  });
  async function user(
    options: {
      id?: string;
      status?: (typeof states)[number];
      createdAt?: Date;
    } = {},
  ) {
    const id = options.id ?? randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        username: id,
        email: id + '@dss.test',
        passwordHash: 'synthetic-never-return',
        displayName: 'Public fixture',
        avatarUrl: null,
        status: options.status ?? 'ACTIVE',
        createdAt: options.createdAt ?? new Date('2000-01-01T00:00:00Z'),
      },
    });
    return id;
  }
  async function points(userId: string, value: number, at = start) {
    return fixture.prisma.communityPointEntry.create({
      data: {
        userId,
        points: value,
        ruleKey: 'leaderboard.characterization',
        reason: 'Synthetic immutable ledger evidence',
        sourceEventId: randomUUID(),
        sourceEventName: 'leaderboard.characterization.v1',
        occurredAt: at,
      },
    });
  }
  async function read(
    viewerId: string,
    overrides: Partial<LeaderboardQuery> = {},
  ) {
    fixture.queries.length = 0;
    const result = await repository.page({
      viewerId,
      period: 'MONTH',
      startsAt: start,
      endsAt: end,
      page: 1,
      limit: 100,
      ...overrides,
    });
    expect(fixture.queries).toHaveLength(1);
    expect(fixture.queries[0]).toMatch(/^\s*WITH\b/);
    expect(fixture.queries[0]).not.toContain('passwordHash');
    // Captured before transfer: normalize whitespace only, not SQL structure or placeholders.
    expect(
      createHash('sha256')
        .update(fixture.queries[0].replace(/\s+/g, ' ').trim())
        .digest('hex'),
    ).toBe(
      result.startsAt
        ? 'f80d18c4d5e8aaa1394bd1932ee37bfcb8ad2d30ca6ba44450c45e7740e8f1f5'
        : '1b00c7d997dc49d54f498de251ba39c61a45fb85364eb87e0dbb57002d8acc21',
    );
    return result;
  }
  it('returns an empty board with no synthetic viewer or extra query', async () => {
    expect(await read(randomUUID())).toEqual({
      period: 'MONTH',
      startsAt: start,
      endsAt: end,
      generatedAt: end,
      items: [],
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 0,
      viewerRank: null,
      viewerCommunityPoints: null,
    });
  });
  it('orders ties by account age then immutable ID, including zero above negative balances', async () => {
    const a = await user({ id: '00000000-0000-0000-0000-000000000001' });
    const b = await user({ id: '00000000-0000-0000-0000-000000000002' });
    const older = await user({ createdAt: new Date('1999-01-01T00:00:00Z') });
    const zero = await user();
    const negative = await user();
    for (const id of [a, b, older]) await points(id, 10);
    await points(negative, -5);
    const result = await read(b);
    expect(result.items.map(({ userId }) => userId)).toEqual([
      older,
      a,
      b,
      zero,
      negative,
    ]);
    expect(result.items.map(({ communityPoints }) => communityPoints)).toEqual([
      10, 10, 10, 0, -5,
    ]);
    expect(result.items.map(({ rank }) => rank)).toEqual([1, 2, 3, 4, 5]);
    expect(result.viewerRank).toBe(3);
    expect(result.items[4].currentLevel).toBe(0);
    expect(Object.keys(result.items[0]).sort()).toEqual(
      [
        'rank',
        'userId',
        'username',
        'displayName',
        'avatarUrl',
        'communityPoints',
        'currentLevel',
        'reputation',
        'selectedTitle',
      ].sort(),
    );
  });
  it.each(states)(
    'keeps ACTIVE population filtering when the viewer is %s',
    async (status) => {
      const active = await user();
      const viewer = await user({ status });
      await points(active, 10);
      await points(viewer, 1000);
      const result = await read(viewer);
      expect(result.total).toBe(status === 'ACTIVE' ? 2 : 1);
      expect(result.items.some(({ userId }) => userId === viewer)).toBe(
        status === 'ACTIVE',
      );
      expect(result.viewerRank).toBe(status === 'ACTIVE' ? 1 : null);
      expect(result.viewerCommunityPoints).toBe(
        status === 'ACTIVE' ? 1000 : null,
      );
    },
  );
  it('keeps inclusive time boundaries, signed period sums and all-time level enrichment', async () => {
    const id = await user();
    await points(id, 50, new Date(start.getTime() - 1));
    await points(id, 5, start);
    await points(id, -2, new Date(start.getTime() + 1));
    await points(id, 7, end);
    await points(id, 1000, new Date(end.getTime() + 1));
    const month = await read(id);
    expect(month.items[0]).toMatchObject({
      communityPoints: 10,
      currentLevel: 2,
    });
    const allTime = await read(id, { startsAt: null, period: 'ALL_TIME' });
    expect(allTime.items[0]).toMatchObject({
      communityPoints: 60,
      currentLevel: 2,
    });
    expect(allTime.startsAt).toBeNull();
  });
  it('returns an off-page viewer separately, including a page beyond the end', async () => {
    const first = await user();
    const viewer = await user();
    await points(first, 10);
    await points(viewer, 5);
    const page = await read(viewer, { limit: 1 });
    expect(page.items.map(({ userId }) => userId)).toEqual([first]);
    expect(page).toMatchObject({
      total: 2,
      totalPages: 2,
      viewerRank: 2,
      viewerCommunityPoints: 5,
    });
    expect(await read(viewer, { page: 99, limit: 1 })).toMatchObject({
      items: [],
      total: 2,
      totalPages: 2,
      viewerRank: 2,
      viewerCommunityPoints: 5,
    });
  });
  it('DEBT-060: characterizes the existing zero-total edge for a missing viewer beyond the last page', async () => {
    await user();
    const present = await read(randomUUID());
    expect(present.total).toBe(1);
    expect(await read(randomUUID(), { page: 99, limit: 1 })).toMatchObject({
      items: [],
      total: 0,
      totalPages: 0,
      viewerRank: null,
      viewerCommunityPoints: null,
    });
  });
  it.each(['active', 'revoked', 'disabled'] as const)(
    'keeps selected-title %s predicates',
    async (state) => {
      const id = await user();
      const title = await fixture.prisma.customTitle.create({
        data: {
          name: 'Synthetic title',
          slug: 'synthetic-title',
          color: '#123456',
          badge: 'synthetic',
          createdById: id,
          updatedById: id,
          isActive: state !== 'disabled',
        },
      });
      const grant = await fixture.prisma.userTitleGrant.create({
        data: {
          userId: id,
          titleId: title.id,
          grantedById: id,
          grantReason: 'Synthetic assignment',
          ...(state === 'revoked'
            ? {
                revokedAt: end,
                revokedById: id,
                revokeReason: 'Synthetic revocation',
              }
            : {}),
        },
      });
      await fixture.prisma.userTitleSelection.create({
        data: { userId: id, grantId: grant.id },
      });
      const result = await read(id);
      expect(result.items[0].selectedTitle).toEqual(
        state === 'active'
          ? { name: 'Synthetic title', color: '#123456', badge: 'synthetic' }
          : null,
      );
    },
  );
  it('sums signed reputation through inclusive endsAt, ignoring later entries', async () => {
    const id = await user();
    const actor = await user();
    for (const [value, at] of [
      [1, new Date(end.getTime() - 1)],
      [-1, end],
      [1, new Date(end.getTime() + 1)],
    ] as const) {
      await fixture.prisma.reputationEntry.create({
        data: {
          actorId: actor,
          recipientId: id,
          value,
          reason: 'Synthetic reputation evidence',
          createdAt: at,
        },
      });
    }
    const result = await read(id);
    expect(result.items.find(({ userId }) => userId === id)?.reputation).toBe(
      0,
    );
  });
  it('new reads observe title disable and account deactivation without cached facts', async () => {
    const id = await user();
    const title = await fixture.prisma.customTitle.create({
      data: {
        name: 'Live title',
        slug: 'live-title',
        color: '#123456',
        badge: 'live',
        createdById: id,
        updatedById: id,
      },
    });
    const grant = await fixture.prisma.userTitleGrant.create({
      data: {
        userId: id,
        titleId: title.id,
        grantedById: id,
        grantReason: 'Synthetic assignment',
      },
    });
    await fixture.prisma.userTitleSelection.create({
      data: { userId: id, grantId: grant.id },
    });
    expect((await read(id)).items[0].selectedTitle?.name).toBe('Live title');
    await fixture.prisma.customTitle.update({
      where: { id: title.id },
      data: { isActive: false },
    });
    expect((await read(id)).items[0].selectedTitle).toBeNull();
    await fixture.prisma.user.update({
      where: { id },
      data: { status: 'DEACTIVATED', deactivatedAt: end },
    });
    expect(await read(id)).toMatchObject({
      items: [],
      total: 0,
      viewerRank: null,
    });
  });
});
