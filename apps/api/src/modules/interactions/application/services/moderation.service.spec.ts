/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/moderation.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies subject authorization, duplicate prevention and annotation rules.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import type { CommentsRepository } from '../../domain/repositories/comments.repository.interface';
import type { ModerationRepository } from '../../domain/repositories/moderation.repository.interface';
import type {
  ContentReport,
  ModerationAnnotation,
} from '../../domain/types/moderation.type';
import type { InteractionTargetsService } from './interaction-targets.service';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  const report: ContentReport = {
    id: 'report-1',
    interactionTargetId: 'target-1',
    commentId: 'comment-1',
    reporterId: 'user-1',
    category: 'SPAM',
    reason: 'Repeated promotion.',
    status: 'OPEN',
    reviewedById: null,
    reviewNote: null,
    reviewedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const annotation: ModerationAnnotation = {
    id: 'annotation-1',
    interactionTargetId: 'target-1',
    commentId: 'comment-1',
    kind: 'WARNING',
    actorId: 'moderator-1',
    reason: 'Community rule violation.',
    expiresAt: null,
    revokedAt: null,
    revokedById: null,
    revokeReason: null,
    createdAt: new Date(),
  };
  let repository: jest.Mocked<ModerationRepository>;
  let comments: jest.Mocked<CommentsRepository>;
  let targets: jest.Mocked<InteractionTargetsService>;
  let service: ModerationService;

  beforeEach(() => {
    repository = {
      createReport: jest.fn().mockResolvedValue(report),
      findOpenReport: jest.fn().mockResolvedValue(null),
      listReports: jest.fn(),
      reviewReport: jest.fn().mockResolvedValue(report),
      createAnnotation: jest.fn().mockResolvedValue(annotation),
      listAnnotations: jest.fn().mockResolvedValue([annotation]),
      revokeAnnotation: jest.fn().mockResolvedValue(annotation),
    };
    comments = {
      findById: jest.fn().mockResolvedValue({
        id: 'comment-1',
        interactionTargetId: 'target-1',
      }),
    } as unknown as jest.Mocked<CommentsRepository>;
    targets = {
      authorize: jest.fn().mockResolvedValue({ allowed: true }),
      getById: jest.fn().mockResolvedValue({ id: 'target-1' }),
    } as unknown as jest.Mocked<InteractionTargetsService>;
    service = new ModerationService(repository, comments, targets);
  });

  it('creates a report only after target and comment subject validation', async () => {
    await service.report(
      'user-1',
      'target-1',
      'comment-1',
      'SPAM',
      '  Repeated promotion.  ',
    );

    expect(targets.authorize.mock.calls).toEqual([
      ['target-1', 'user-1', 'READ'],
    ]);
    expect(repository.createReport.mock.calls).toEqual([
      [
        {
          interactionTargetId: 'target-1',
          commentId: 'comment-1',
          reporterId: 'user-1',
          category: 'SPAM',
          reason: 'Repeated promotion.',
        },
      ],
    ]);
  });

  it('fails closed when the target owner denies reads', async () => {
    targets.authorize.mockResolvedValue({ allowed: false } as never);

    await expect(
      service.report('user-1', 'target-1', null, 'OTHER', 'A valid reason.'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.createReport.mock.calls).toHaveLength(0);
  });

  it('rejects a comment from another interaction target', async () => {
    comments.findById.mockResolvedValue({
      id: 'comment-1',
      interactionTargetId: 'another-target',
    } as never);

    await expect(
      service.report(
        'user-1',
        'target-1',
        'comment-1',
        'OTHER',
        'A valid reason.',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents a second open report for the same subject', async () => {
    repository.findOpenReport.mockResolvedValue(report);

    await expect(
      service.report(
        'user-1',
        'target-1',
        'comment-1',
        'SPAM',
        'Repeated promotion.',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects annotation expiration in the past', async () => {
    await expect(
      service.annotate(
        'moderator-1',
        'target-1',
        null,
        'WARNING',
        'A valid reason.',
        new Date(Date.now() - 1000),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reports missing or already revoked annotations consistently', async () => {
    repository.revokeAnnotation.mockResolvedValue(null);

    await expect(
      service.revokeAnnotation(
        'annotation-1',
        'moderator-1',
        'Decision corrected.',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

/**
 * A report can be duplicated in opinions, never in the open queue key.
 */
