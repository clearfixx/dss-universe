/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Policy Tests
 * 📄 File: apps/api/src/modules/news/application/services/news-interaction.policy.spec.ts
 *
 * 🎯 Purpose:
 * Characterizes unchanged News publication and per-capability flag decisions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { NewsRepository } from '../../domain/repositories/news.repository.interface';
import type { NewsArticle } from '../../domain/types/news-article.type';
import { NewsInteractionPolicy } from './news-interaction.policy';

describe('NewsInteractionPolicy', () => {
  const article = {
    interactionTargetId: 'target',
    status: 'PUBLISHED',
    allowComments: true,
    allowRating: true,
    allowSharing: true,
  } as NewsArticle;
  const repository = { findById: jest.fn() };
  const policy = new NewsInteractionPolicy(
    repository as unknown as NewsRepository,
  );
  beforeEach(() => repository.findById.mockReset().mockResolvedValue(article));
  it.each(['READ', 'COMMENT', 'REACT', 'BOOKMARK', 'SHARE'] as const)(
    'allows published %s with the same owner coordinates',
    async (capability) => {
      expect(
        await policy.authorize({
          articleId: 'article',
          interactionTargetId: 'target',
          capability,
        }),
      ).toEqual({ allowed: true });
      expect(repository.findById.mock.calls).toEqual([['article']]);
    },
  );
  it.each([
    'DRAFT',
    'IN_REVIEW',
    'CHANGES_REQUESTED',
    'APPROVED',
    'SCHEDULED',
    'ARCHIVED',
  ] as const)('denies %s content', async (status) => {
    repository.findById.mockResolvedValue({ ...article, status });
    expect(
      await policy.authorize({
        articleId: 'article',
        interactionTargetId: 'target',
        capability: 'READ',
      }),
    ).toEqual({ allowed: false, reason: 'NEWS_NOT_PUBLISHED' });
  });
  it.each([
    ['COMMENT', 'allowComments', 'NEWS_COMMENTS_DISABLED'],
    ['REACT', 'allowRating', 'NEWS_RATING_DISABLED'],
    ['SHARE', 'allowSharing', 'NEWS_SHARING_DISABLED'],
  ] as const)(
    'denies disabled %s without altering other flags',
    async (capability, flag, reason) => {
      repository.findById.mockResolvedValue({ ...article, [flag]: false });
      expect(
        await policy.authorize({
          articleId: 'article',
          interactionTargetId: 'target',
          capability,
        }),
      ).toEqual({ allowed: false, reason });
    },
  );
  it('rejects missing or mismatched owner records before publication/flag checks', async () => {
    repository.findById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...article, interactionTargetId: 'other' });
    for (let i = 0; i < 2; i++)
      expect(
        await policy.authorize({
          articleId: 'article',
          interactionTargetId: 'target',
          capability: 'READ',
        }),
      ).toEqual({ allowed: false, reason: 'OWNER_RECORD_UNAVAILABLE' });
  });
  it('propagates repository failure without synthesizing an allow', async () => {
    repository.findById.mockRejectedValue(new Error('Store unavailable'));
    await expect(
      policy.authorize({
        articleId: 'article',
        interactionTargetId: 'target',
        capability: 'READ',
      }),
    ).rejects.toThrow('Store unavailable');
  });
});
