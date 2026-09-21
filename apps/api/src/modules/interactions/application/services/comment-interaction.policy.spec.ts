import type { CommentsRepository } from '../../domain/repositories/comments.repository.interface';
import type { InteractionTarget } from '../../domain/types/interaction-target.type';
import type { InteractionPolicyRegistryService } from './interaction-policy-registry.service';
import type { InteractionTargetsService } from './interaction-targets.service';
import { CommentInteractionPolicy } from './comment-interaction.policy';

describe('CommentInteractionPolicy', () => {
  const target = {
    id: 'reaction-target-1',
    ownerId: 'comment-1',
  } as InteractionTarget;
  const comment = {
    id: 'comment-1',
    reactionTargetId: target.id,
    interactionTargetId: 'article-target-1',
    isDeleted: false,
  };
  const policies = {
    register: jest.fn(),
    unregister: jest.fn(),
  } as unknown as InteractionPolicyRegistryService;
  const targets = {
    authorize: jest.fn().mockResolvedValue({ allowed: true }),
  } as unknown as jest.Mocked<InteractionTargetsService>;
  const comments = {
    findById: jest.fn().mockResolvedValue(comment),
  } as unknown as jest.Mocked<CommentsRepository>;
  const policy = new CommentInteractionPolicy(policies, targets, comments);

  beforeEach(() => jest.clearAllMocks());

  it('delegates comment read and reaction access to the parent target', async () => {
    await expect(policy.authorize(target, 'actor-1', 'REACT')).resolves.toEqual(
      {
        allowed: true,
      },
    );
    expect(targets.authorize.mock.calls[0]).toEqual([
      'article-target-1',
      'actor-1',
      'READ',
    ]);
  });

  it('fails closed for a mismatched or deleted comment target', async () => {
    comments.findById.mockResolvedValueOnce({
      ...comment,
      reactionTargetId: 'different-target',
    } as never);
    await expect(policy.authorize(target, 'actor-1', 'READ')).resolves.toEqual({
      allowed: false,
      reason: 'COMMENT_UNAVAILABLE',
    });
    comments.findById.mockResolvedValueOnce({
      ...comment,
      isDeleted: true,
    } as never);
    await expect(policy.authorize(target, 'actor-1', 'REACT')).resolves.toEqual(
      {
        allowed: false,
        reason: 'COMMENT_DELETED',
      },
    );
  });
});
