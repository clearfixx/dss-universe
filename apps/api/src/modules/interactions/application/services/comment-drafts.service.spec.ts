/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/comment-drafts.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies comment draft ownership, normalization and optimistic conflicts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ConflictException, ForbiddenException } from '@nestjs/common';
import { createEmptyEditorDocument } from '@dss/editor';

import { EditorService } from '../../../editor/application/services/editor.service';
import type { EditorHtmlRenderer } from '../../../editor/infrastructure/rendering/editor-html.renderer';
import type { CommentDraftsRepository } from '../../domain/repositories/comment-drafts.repository.interface';
import type { CommentsRepository } from '../../domain/repositories/comments.repository.interface';
import type { CommentDraft } from '../../domain/types/comment-draft.type';
import type { InteractionTargetsService } from './interaction-targets.service';
import { CommentDraftsService } from './comment-drafts.service';

describe('CommentDraftsService', () => {
  const documentJson = JSON.stringify(createEmptyEditorDocument('COMMENT'));
  const draft: CommentDraft = {
    id: 'draft-1',
    authorId: 'author-1',
    interactionTargetId: 'target-1',
    parentId: null,
    documentJson,
    plainText: '',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let drafts: jest.Mocked<CommentDraftsRepository>;
  let comments: jest.Mocked<CommentsRepository>;
  let targets: jest.Mocked<InteractionTargetsService>;
  let service: CommentDraftsService;

  beforeEach(() => {
    drafts = {
      save: jest.fn().mockResolvedValue(draft),
      findById: jest.fn().mockResolvedValue(draft),
      findByScope: jest.fn().mockResolvedValue(draft),
      listByAuthor: jest.fn().mockResolvedValue([draft]),
      delete: jest.fn().mockResolvedValue(true),
    };
    comments = {
      create: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      edit: jest.fn(),
      tombstone: jest.fn(),
      revisions: jest.fn(),
    };
    targets = {
      authorize: jest.fn().mockResolvedValue({ allowed: true, reason: null }),
    } as unknown as jest.Mocked<InteractionTargetsService>;
    service = new CommentDraftsService(
      drafts,
      comments,
      targets,
      new EditorService({} as EditorHtmlRenderer),
    );
  });

  it('normalizes and versions a Comments-owned root draft', async () => {
    await service.save('author-1', {
      interactionTargetId: 'target-1',
      documentJson,
      baseVersion: 0,
    });

    expect(drafts.save.mock.calls[0]?.[0]).toEqual({
      authorId: 'author-1',
      interactionTargetId: 'target-1',
      parentId: null,
      scopeKey: 'target-1:root',
      documentJson,
      plainText: '',
      baseVersion: 0,
    });
  });

  it('surfaces stale versions as explicit conflicts', async () => {
    drafts.save.mockResolvedValue(null);
    await expect(
      service.save('author-1', {
        interactionTargetId: 'target-1',
        documentJson,
        baseVersion: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechecks owner policy before restoring draft content', async () => {
    targets.authorize.mockResolvedValue({
      allowed: false,
      reason: 'TARGET_LOCKED',
    } as never);
    await expect(
      service.restore('author-1', 'target-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(drafts.findByScope.mock.calls).toHaveLength(0);
  });

  it('does not let another actor discard a private draft', async () => {
    await expect(service.discard('intruder', draft.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(drafts.delete.mock.calls).toHaveLength(0);
  });
});

/** A conflict is recoverable; a silent overwrite is not. */
