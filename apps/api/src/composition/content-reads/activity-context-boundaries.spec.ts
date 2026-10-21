/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/activity-context-boundaries.spec.ts
 *
 * 🎯 Purpose:
 * Pins minimal Users context, owned Activity persistence and failure behavior.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { MODULE_METADATA } from '@nestjs/common/constants';
import type { PrismaService } from '@api/core/database';
import { ActivityModule, ACTOR_ACTIVITY_READER } from '@api/modules/activity';
import { PrismaUserActivityContextReader } from '../../modules/users/infrastructure/repositories/prisma-user-activity-context.reader';
import { PrismaActivityRepository } from '../../modules/activity/infrastructure/repositories/prisma-activity.repository';
import { ActivityViewerContextAdapter } from './infrastructure/activity-viewer-context.adapter';
describe('Activity viewer context boundaries', () => {
  function fixture() {
    const findUnique = jest.fn().mockResolvedValue({
      interests: ['TypeScript'],
      passwordHash: 'must not escape',
    });
    const follows = jest
      .fn()
      .mockResolvedValue([{ followingId: 'followed', deletedAt: new Date() }]);
    const blocks = jest.fn().mockResolvedValue([
      { blockerId: 'viewer', blockedId: 'outbound' },
      { blockerId: 'inbound', blockedId: 'viewer' },
    ]);
    const reader = new PrismaUserActivityContextReader({
      user: { findUnique },
      userFollow: { findMany: follows },
      userBlock: { findMany: blocks },
    } as unknown as PrismaService);
    return { reader, findUnique, follows, blocks };
  }
  it('reads exact Users projections and returns only three independent arrays', async () => {
    const { reader, findUnique, follows, blocks } = fixture();
    expect(await reader.readForViewer('viewer')).toEqual({
      interests: ['TypeScript'],
      followingIds: ['followed'],
      blockedIds: ['outbound', 'inbound'],
    });
    expect(findUnique.mock.calls).toEqual([
      [{ where: { id: 'viewer' }, select: { interests: true } }],
    ]);
    expect(follows.mock.calls).toEqual([
      [
        {
          where: { followerId: 'viewer', deletedAt: null },
          select: { followingId: true },
        },
      ],
    ]);
    expect(blocks.mock.calls).toEqual([
      [
        {
          where: {
            deletedAt: null,
            OR: [{ blockerId: 'viewer' }, { blockedId: 'viewer' }],
          },
          select: { blockerId: true, blockedId: true },
        },
      ],
    ]);
  });
  it('preserves missing-profile behavior without skipping relationship facts', async () => {
    const { reader, findUnique } = fixture();
    findUnique.mockResolvedValue(null);
    expect(await reader.readForViewer('viewer')).toEqual({
      interests: [],
      followingIds: ['followed'],
      blockedIds: ['outbound', 'inbound'],
    });
  });
  it('does not expose mutable profile interests or raw edge records', async () => {
    const { reader, findUnique } = fixture();
    const interests = ['backend'];
    findUnique.mockResolvedValue({ interests });
    const result = await reader.readForViewer('viewer');
    expect(result.interests).not.toBe(interests);
    expect(Object.keys(result).sort()).toEqual([
      'blockedIds',
      'followingIds',
      'interests',
    ]);
  });
  it.each(['profile', 'follows', 'blocks'])(
    'propagates %s storage errors instead of empty context',
    async (owner) => {
      const { reader, findUnique, follows, blocks } = fixture();
      (owner === 'profile'
        ? findUnique
        : owner === 'follows'
          ? follows
          : blocks
      ).mockRejectedValue(new Error('Unavailable'));
      await expect(reader.readForViewer('viewer')).rejects.toThrow(
        'Unavailable',
      );
      if (owner === 'profile') {
        expect(follows.mock.calls).toHaveLength(0);
        expect(blocks.mock.calls).toHaveLength(0);
      }
    },
  );
  it('orders profile before relationship reads, preserving parallel follow/block reads', async () => {
    const { reader, findUnique, follows, blocks } = fixture();
    let completeProfile: ((value: { interests: string[] }) => void) | undefined;
    findUnique.mockReturnValue(
      new Promise((resolve) => {
        completeProfile = resolve;
      }),
    );
    const pending = reader.readForViewer('viewer');
    expect(follows.mock.calls).toHaveLength(0);
    expect(blocks.mock.calls).toHaveLength(0);
    completeProfile!({ interests: [] });
    await pending;
    expect(follows.mock.calls).toHaveLength(1);
    expect(blocks.mock.calls).toHaveLength(1);
  });
  it('selects only context arrays and copies them at the root boundary', async () => {
    const context = {
      interests: ['typescript'],
      followingIds: ['f'],
      blockedIds: ['b'],
      email: 'private',
      roles: ['owner'],
    };
    const readForViewer = jest.fn().mockResolvedValue(context);
    const result = await new ActivityViewerContextAdapter({
      readForViewer,
    }).readForViewer('viewer');
    expect(result).toEqual({
      interests: ['typescript'],
      followingIds: ['f'],
      blockedIds: ['b'],
    });
    expect(result.interests).not.toBe(context.interests);
    expect(result.followingIds).not.toBe(context.followingIds);
    expect(result.blockedIds).not.toBe(context.blockedIds);
    expect(readForViewer.mock.calls).toEqual([['viewer']]);
  });
  it('propagates a Users context provider failure', async () => {
    await expect(
      new ActivityViewerContextAdapter({
        readForViewer: jest
          .fn()
          .mockRejectedValue(new Error('Users unavailable')),
      }).readForViewer('viewer'),
    ).rejects.toThrow('Users unavailable');
  });
  it('keeps the ranker and full feed service private', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, ActivityModule),
    ).toEqual([ACTOR_ACTIVITY_READER]);
  });
  it.each([false, true])(
    'preserves Activity candidate query, bound and metadata projection for member=%s',
    async (member) => {
      const occurredAt = new Date();
      const findMany = jest.fn().mockResolvedValue([
        {
          id: 'entry',
          actorId: 'actor',
          module: 'NEWS',
          action: 'created',
          subjectType: 'NewsArticle',
          subjectId: 'article',
          visibility: 'PUBLIC',
          occurredAt,
          metadata: {
            tags: 'typescript',
            number: 1,
            boolean: true,
            nil: null,
            nested: { private: 'no' },
            array: ['no'],
          },
          sourceEventId: 'private-internal-coordinate',
        },
      ]);
      const repo = new PrismaActivityRepository({
        activityEntry: { findMany },
      } as unknown as PrismaService);
      const query = {
        ...(member ? { viewerId: 'viewer' } : {}),
        modules: ['NEWS'],
        page: 5,
        limit: 2,
      };
      expect(
        await repo.findFeedCandidates(query, ['blocked', 'blocked']),
      ).toEqual([
        {
          id: 'entry',
          actorId: 'actor',
          module: 'NEWS',
          action: 'created',
          subjectType: 'NewsArticle',
          subjectId: 'article',
          visibility: 'PUBLIC',
          occurredAt,
          metadata: { tags: 'typescript', number: 1, boolean: true, nil: null },
        },
      ]);
      expect(findMany.mock.calls).toEqual([
        [
          {
            where: {
              retractedAt: null,
              visibility: member ? { in: ['PUBLIC', 'MEMBERS'] } : 'PUBLIC',
              module: { in: ['NEWS'] },
              actorId: { notIn: ['blocked'] },
            },
            orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
            take: 500,
          },
        ],
      ]);
    },
  );
  it('omits empty module/block predicates and reads no foreign tables', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repo = new PrismaActivityRepository({
      activityEntry: { findMany },
    } as unknown as PrismaService);
    expect(await repo.findFeedCandidates({ page: 1, limit: 20 }, [])).toEqual(
      [],
    );
    expect(findMany.mock.calls).toEqual([
      [
        {
          where: { retractedAt: null, visibility: 'PUBLIC' },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          take: 500,
        },
      ],
    ]);
  });
  it.each([null, { lastVisitedAt: new Date('2026-10-14') }])(
    'preserves own visit-state projection %p',
    async (state) => {
      const findUnique = jest.fn().mockResolvedValue(state);
      const repo = new PrismaActivityRepository({
        activityFeedState: { findUnique },
      } as unknown as PrismaService);
      expect(await repo.lastVisitedAt('viewer')).toEqual(
        state?.lastVisitedAt ?? null,
      );
      expect(findUnique.mock.calls).toEqual([
        [{ where: { userId: 'viewer' }, select: { lastVisitedAt: true } }],
      ]);
    },
  );
  it.each(['state', 'candidates'])(
    'propagates %s Activity storage errors',
    async (owner) => {
      const failure = jest
        .fn()
        .mockRejectedValue(new Error('Activity unavailable'));
      const repo = new PrismaActivityRepository({
        activityFeedState: { findUnique: failure },
        activityEntry: { findMany: failure },
      } as unknown as PrismaService);
      await expect(
        owner === 'state'
          ? repo.lastVisitedAt('viewer')
          : repo.findFeedCandidates({ page: 1, limit: 20 }, []),
      ).rejects.toThrow('Activity unavailable');
    },
  );
});
