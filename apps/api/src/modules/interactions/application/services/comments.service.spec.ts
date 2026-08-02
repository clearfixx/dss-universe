/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/comments.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies target authorization, reply invariants and author ownership.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { EditorService } from '../../../editor/application/services/editor.service';
import type { EditorHtmlRenderer } from '../../../editor/infrastructure/rendering/editor-html.renderer';

import type { CommentsRepository } from '../../domain/repositories/comments.repository.interface';
import type { Comment } from '../../domain/types/comment.type';
import type { InteractionTargetsService } from './interaction-targets.service';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  const comment: Comment = {
    id: 'comment-1',
    interactionTargetId: 'target-1',
    authorId: 'author-1',
    parentId: null,
    mentionedUserIds: [],
    body: 'Hello',
    documentJson:
      '{"schemaVersion":1,"profile":"COMMENT","content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]}}',
    searchText: 'hello',
    isDeleted: false,
    editedAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let repository: jest.Mocked<CommentsRepository>;
  let targets: jest.Mocked<InteractionTargetsService>;
  let service: CommentsService;

  beforeEach(() => {
    repository = {
      create: jest.fn().mockResolvedValue(comment),
      findById: jest.fn().mockResolvedValue(comment),
      list: jest.fn().mockResolvedValue({
        items: [comment],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
      edit: jest.fn().mockResolvedValue({ ...comment, body: 'Updated' }),
      tombstone: jest
        .fn()
        .mockResolvedValue({ ...comment, body: null, isDeleted: true }),
      revisions: jest.fn().mockResolvedValue([]),
    };
    targets = {
      authorize: jest.fn().mockResolvedValue({
        target: {} as never,
        capability: 'COMMENT',
        allowed: true,
        reason: null,
      }),
    } as unknown as jest.Mocked<InteractionTargetsService>;
    service = new CommentsService(
      repository,
      targets,
      new EditorService({} as EditorHtmlRenderer),
    );
  });

  it('creates normalized top-level comments after owner authorization', async () => {
    await service.create('author-1', 'target-1', { body: '  Hello  ' });

    expect(repository.create.mock.calls[0]?.[0]).toEqual({
      interactionTargetId: 'target-1',
      authorId: 'author-1',
      parentId: null,
      body: 'Hello',
      documentJson: comment.documentJson,
      searchText: 'hello',
      mentionedUsernames: [],
    });
  });

  it('extracts unique mentions without treating email addresses as mentions', async () => {
    await service.create('author-1', 'target-1', {
      body: 'Hello @Astro and @astro; mail astronaut@example.com',
    });

    expect(repository.create.mock.calls[0]?.[0].mentionedUsernames).toEqual([
      'Astro',
    ]);
  });

  it('accepts canonical COMMENT JSON and extracts structured mentions', async () => {
    const documentJson = JSON.stringify({
      schemaVersion: 1,
      profile: 'COMMENT',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { textAlign: 'center' },
            content: [
              { type: 'text', text: 'Hello ' },
              {
                type: 'mention',
                attrs: {
                  userId: '123e4567-e89b-42d3-a456-426614174000',
                  username: 'Commander',
                },
              },
            ],
          },
        ],
      },
    });

    await service.create('author-1', 'target-1', { documentJson });

    expect(repository.create.mock.calls[0]?.[0]).toMatchObject({
      body: 'Hello @Commander',
      searchText: 'hello @commander',
      mentionedUsernames: ['Commander'],
      documentJson,
    });
  });

  it('rejects ambiguous input and the wrong editor profile', async () => {
    await expect(
      service.create('author-1', 'target-1', {
        body: 'Hello',
        documentJson: comment.documentJson ?? undefined,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create('author-1', 'target-1', {
        documentJson: JSON.stringify({
          schemaVersion: 1,
          profile: 'WIKI',
          content: { type: 'doc', content: [{ type: 'paragraph' }] },
        }),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fails closed when the target owner denies comments', async () => {
    targets.authorize.mockResolvedValue({
      target: {} as never,
      capability: 'COMMENT',
      allowed: false,
      reason: 'PROFILE_PRIVATE',
    });

    await expect(
      service.create('author-1', 'target-1', { body: 'Hello' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts one reply level on the same target', async () => {
    await service.create('author-2', 'target-1', { body: 'Reply' }, comment.id);

    expect(repository.create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ parentId: comment.id }),
    );
  });

  it('rejects cross-target and nested replies', async () => {
    repository.findById.mockResolvedValue({
      ...comment,
      interactionTargetId: 'target-2',
    });
    await expect(
      service.create('author-2', 'target-1', { body: 'Reply' }, comment.id),
    ).rejects.toBeInstanceOf(BadRequestException);

    repository.findById.mockResolvedValue({
      ...comment,
      parentId: 'root-comment',
    });
    await expect(
      service.create('author-2', 'target-1', { body: 'Reply' }, comment.id),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('limits edits, tombstones and revision history to the author', async () => {
    await expect(
      service.edit('another-user', comment.id, { body: 'Updated' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.remove('another-user', comment.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.revisions('another-user', comment.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns tombstones idempotently without another write', async () => {
    repository.findById.mockResolvedValue({
      ...comment,
      body: null,
      isDeleted: true,
      deletedAt: new Date(),
    });

    await expect(service.remove('author-1', comment.id)).resolves.toMatchObject(
      {
        isDeleted: true,
      },
    );
    expect(repository.tombstone.mock.calls).toHaveLength(0);
  });
});

/**
 * Thread depth is bounded now so future renderers do not discover recursion by fire.
 */
