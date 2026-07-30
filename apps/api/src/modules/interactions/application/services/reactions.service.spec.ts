/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/reactions.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies reaction authorization and separation from reputation policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ForbiddenException } from '@nestjs/common';

import type { ReactionsRepository } from '../../domain/repositories/reactions.repository.interface';
import type { ReactionSummary } from '../../domain/types/reaction.type';
import type { InteractionTargetsService } from './interaction-targets.service';
import { ReactionsService } from './reactions.service';

describe('ReactionsService', () => {
  const summary: ReactionSummary = {
    interactionTargetId: 'target-1',
    likes: 0,
    upvotes: 1,
    downvotes: 0,
    score: 1,
    total: 1,
    updatedAt: new Date(),
    viewerReaction: 'UPVOTE',
  };
  let repository: jest.Mocked<ReactionsRepository>;
  let targets: jest.Mocked<InteractionTargetsService>;
  let service: ReactionsService;

  beforeEach(() => {
    repository = {
      set: jest.fn().mockResolvedValue({
        reaction: {
          id: 'reaction-1',
          interactionTargetId: 'target-1',
          actorId: 'actor-1',
          kind: 'UPVOTE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        aggregate: summary,
        changed: true,
      }),
      clear: jest.fn().mockResolvedValue({
        removed: true,
        aggregate: { ...summary, upvotes: 0, score: 0, total: 0 },
      }),
      summary: jest.fn().mockResolvedValue(summary),
    };
    targets = {
      authorize: jest.fn().mockResolvedValue({
        target: {} as never,
        capability: 'REACT',
        allowed: true,
        reason: null,
      }),
    } as unknown as jest.Mocked<InteractionTargetsService>;
    service = new ReactionsService(repository, targets);
  });

  it('sets a reaction only after owner authorization', async () => {
    await service.set('actor-1', 'target-1', 'UPVOTE');

    expect(targets.authorize.mock.calls).toEqual([
      ['target-1', 'actor-1', 'REACT'],
    ]);
    expect(repository.set.mock.calls).toEqual([
      ['target-1', 'actor-1', 'UPVOTE'],
    ]);
  });

  it('fails closed when the owner denies reactions', async () => {
    targets.authorize.mockResolvedValue({
      target: {} as never,
      capability: 'REACT',
      allowed: false,
      reason: 'TARGET_LOCKED',
    });

    await expect(
      service.set('actor-1', 'target-1', 'LIKE'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.set.mock.calls).toHaveLength(0);
  });

  it('clears the viewer reaction without touching another ledger', async () => {
    await expect(service.clear('actor-1', 'target-1')).resolves.toEqual(
      expect.objectContaining({ viewerReaction: null, total: 0 }),
    );
    expect(repository.clear.mock.calls).toEqual([['target-1', 'actor-1']]);
  });

  it('uses read authorization for aggregate summaries', async () => {
    targets.authorize.mockResolvedValue({
      target: {} as never,
      capability: 'READ',
      allowed: true,
      reason: null,
    });

    await expect(service.summary('actor-1', 'target-1')).resolves.toBe(summary);
    expect(targets.authorize.mock.calls).toEqual([
      ['target-1', 'actor-1', 'READ'],
    ]);
  });
});

/**
 * If a reaction starts editing reputation directly, the test should eject it.
 */
