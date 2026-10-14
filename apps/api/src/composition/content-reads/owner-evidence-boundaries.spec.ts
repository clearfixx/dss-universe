/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/owner-evidence-boundaries.spec.ts
 *
 * 🎯 Purpose:
 * Pins owner queries, scalar adapters, minimal projections and private providers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { MODULE_METADATA } from '@nestjs/common/constants';
import type { PrismaService } from '@api/core/database';
import {
  ReputationModule,
  REPUTATION_TOTAL_READER,
} from '@api/modules/reputation';
import { PrismaCommentCountReader } from '../../modules/interactions/infrastructure/repositories/prisma-comment-count.reader';
import { PrismaReputationTotalReader } from '../../modules/reputation/infrastructure/repositories/prisma-reputation-total.reader';
import { PrismaMediaImageEligibilityReader } from '../../modules/media/infrastructure/repositories/prisma-media-image-eligibility.reader';
import { GateAccountEvidenceAdapter } from './infrastructure/gate-account-evidence.adapter';
import { GateCommentCountAdapter } from './infrastructure/gate-comment-count.adapter';
import { GateReputationTotalAdapter } from './infrastructure/gate-reputation-total.adapter';
import { WallImageEligibilityAdapter } from './infrastructure/wall-image-eligibility.adapter';
describe('Owner evidence read boundaries', () => {
  it('publishes the Reputation scalar token, not its ledger service or repository', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, ReputationModule),
    ).toEqual([REPUTATION_TOTAL_READER]);
  });
  it('counts only non-deleted authored comments without new target or visibility filters', async () => {
    const count = jest.fn().mockResolvedValue(7);
    expect(
      await new PrismaCommentCountReader({
        comment: { count },
      } as unknown as PrismaService).countByAuthor('author'),
    ).toBe(7);
    expect(count.mock.calls).toEqual([
      [{ where: { authorId: 'author', deletedAt: null } }],
    ]);
  });
  it.each([null, -5, 0, 8])(
    'maps ledger sum %p without excluding compensating entries',
    async (value) => {
      const aggregate = jest.fn().mockResolvedValue({ _sum: { value } });
      const reader = new PrismaReputationTotalReader({
        reputationEntry: { aggregate },
      } as unknown as PrismaService);
      expect(await reader.totalFor('recipient')).toBe(value ?? 0);
      expect(aggregate.mock.calls).toEqual([
        [{ where: { recipientId: 'recipient' }, _sum: { value: true } }],
      ]);
    },
  );
  it.each([0, 1, 2])(
    'preserves image count decision %s and exact ownership/readiness/deletion query',
    async (value) => {
      const count = jest.fn().mockResolvedValue(value);
      expect(
        await new PrismaMediaImageEligibilityReader({
          media: { count },
        } as unknown as PrismaService).isAttachableImage('media', 'author'),
      ).toBe(value === 1);
      expect(count.mock.calls).toEqual([
        [
          {
            where: {
              id: 'media',
              ownerId: 'author',
              kind: 'IMAGE',
              status: 'READY',
              deletedAt: null,
            },
          },
        ],
      ]);
    },
  );
  it('selects only account evidence and copies its timestamp', async () => {
    const createdAt = new Date('2020-01-01');
    const find = jest.fn().mockResolvedValue({
      active: false,
      createdAt,
      passwordHash: 'secret',
      username: 'private',
    });
    const result = await new GateAccountEvidenceAdapter({ find }).find(
      'subject',
    );
    expect(result).toEqual({ active: false, createdAt });
    expect(result?.createdAt).not.toBe(createdAt);
    expect(find.mock.calls).toEqual([['subject']]);
    find.mockResolvedValue(null);
    expect(
      await new GateAccountEvidenceAdapter({ find }).find('missing'),
    ).toBeNull();
  });
  it('maps only scalar coordinates through comment, reputation and image adapters', async () => {
    const countByAuthor = jest.fn().mockResolvedValue(4);
    const totalFor = jest.fn().mockResolvedValue(-6);
    const isAttachableImage = jest.fn().mockResolvedValue(false);
    expect(
      await new GateCommentCountAdapter({ countByAuthor }).countByAuthor(
        'author',
      ),
    ).toBe(4);
    expect(
      await new GateReputationTotalAdapter({ totalFor }).totalFor('recipient'),
    ).toBe(-6);
    expect(
      await new WallImageEligibilityAdapter({
        isAttachableImage,
      }).isAttachableImage('media', 'author'),
    ).toBe(false);
    expect(countByAuthor.mock.calls).toEqual([['author']]);
    expect(totalFor.mock.calls).toEqual([['recipient']]);
    expect(isAttachableImage.mock.calls).toEqual([['media', 'author']]);
  });
  it.each(['account', 'comment', 'reputation', 'image'])(
    'propagates %s adapter failures',
    async (owner) => {
      const failure = jest
        .fn()
        .mockRejectedValue(new Error('Owner unavailable'));
      const result =
        owner === 'account'
          ? new GateAccountEvidenceAdapter({ find: failure }).find('subject')
          : owner === 'comment'
            ? new GateCommentCountAdapter({
                countByAuthor: failure,
              }).countByAuthor('subject')
            : owner === 'reputation'
              ? new GateReputationTotalAdapter({ totalFor: failure }).totalFor(
                  'subject',
                )
              : new WallImageEligibilityAdapter({
                  isAttachableImage: failure,
                }).isAttachableImage('media', 'subject');
      await expect(result).rejects.toThrow('Owner unavailable');
    },
  );
  it.each(['comment', 'reputation', 'image'])(
    'propagates %s storage failures',
    async (owner) => {
      const failure = jest
        .fn()
        .mockRejectedValue(new Error('Storage unavailable'));
      const result =
        owner === 'comment'
          ? new PrismaCommentCountReader({
              comment: { count: failure },
            } as unknown as PrismaService).countByAuthor('subject')
          : owner === 'reputation'
            ? new PrismaReputationTotalReader({
                reputationEntry: { aggregate: failure },
              } as unknown as PrismaService).totalFor('subject')
            : new PrismaMediaImageEligibilityReader({
                media: { count: failure },
              } as unknown as PrismaService).isAttachableImage(
                'media',
                'subject',
              );
      await expect(result).rejects.toThrow('Storage unavailable');
    },
  );
});
