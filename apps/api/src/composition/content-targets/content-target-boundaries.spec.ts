/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Target Tests
 * 📄 File: apps/api/src/composition/content-targets/content-target-boundaries.spec.ts
 *
 * 🎯 Purpose:
 * Pins semantic write delegation and private technical providers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { MODULE_METADATA } from '@nestjs/common/constants';
import { InteractionsModule } from '@api/modules/interactions';
import { PrismaInteractionTargetWriter } from '@api/modules/interactions/infrastructure';
import {
  NEWS_DRAFT_TRANSACTION,
  type NewsDraftTransaction,
  type CreateNewsDraft,
} from '@api/modules/news';
import {
  PROFILE_WALL_TRANSACTION,
  type ProfileWallTransaction,
  type ProfileWallWriteResult,
} from '@api/modules/users';
import type { PrismaService } from '@api/core/database';
import { PrismaNewsRepository } from '../../modules/news/infrastructure/repositories/prisma-news.repository';
import { PrismaUserWallRepository } from '../../modules/users/infrastructure/repositories/prisma-user-wall.repository';
import { ContentTargetCompositionModule } from './content-target-composition.module';
import { createEmptyEditorDocument } from '@dss/editor';

describe('Content target semantic boundaries', () => {
  const input: CreateNewsDraft = {
    authorId: 'subject',
    postType: 'STANDARD',
    visibility: 'PUBLIC',
    language: 'uk',
    slug: 'draft',
    title: 'Draft',
    shortText: 'Draft description',
    document: createEmptyEditorDocument('NEWS'),
    templateData: {},
    plainText: '',
    searchText: '',
    publicSearchText: '',
    hasContentGates: false,
    coverMediaId: null,
    attachmentMediaIds: [],
  };
  it('publishes semantic tokens, not the technical target writer, as Nest integrations', () => {
    const exports = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      InteractionsModule,
    ) as unknown[];
    expect(exports).not.toContain(PrismaInteractionTargetWriter);
    expect(
      Reflect.getMetadata(
        MODULE_METADATA.EXPORTS,
        ContentTargetCompositionModule,
      ),
    ).toEqual([NEWS_DRAFT_TRANSACTION, PROFILE_WALL_TRANSACTION]);
  });
  it('delegates News writes without passing a Prisma client', async () => {
    const writes = {
      createDraft: jest.fn().mockResolvedValue({ id: 'article' }),
      saveDraft: jest.fn().mockResolvedValue(null),
    } satisfies jest.Mocked<NewsDraftTransaction>;
    const repository = new PrismaNewsRepository({} as PrismaService, writes);
    expect(await repository.createDraft(input)).toEqual({ id: 'article' });
    expect(
      await repository.saveDraft({
        ...input,
        articleId: 'article',
        baseVersion: 1,
        changeSummary: null,
      }),
    ).toBeNull();
    expect(writes.createDraft.mock.calls).toEqual([[input]]);
    expect(writes.saveDraft.mock.calls[0]).toHaveLength(1);
  });
  it('retains Wall tombstone redaction in its owner while selecting semantic write results', async () => {
    const result: ProfileWallWriteResult = {
      id: 'wall',
      interactionTargetId: 'target',
      authorId: 'subject',
      profileOwnerId: 'subject',
      body: 'Retained history',
      imageMediaId: 'image',
      deletedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const writes = {
      create: jest.fn().mockResolvedValue(result),
      tombstone: jest.fn().mockResolvedValue(result),
    } satisfies jest.Mocked<ProfileWallTransaction>;
    const repository = new PrismaUserWallRepository(
      {} as PrismaService,
      writes,
    );
    const post = await repository.tombstone('wall', 'subject', 'Reason');
    expect(post).toMatchObject({
      isDeleted: true,
      body: null,
      imageMediaId: null,
    });
    expect(writes.tombstone.mock.calls).toEqual([
      ['wall', 'subject', 'Reason'],
    ]);
  });
  it('does not hide failed News writes', async () => {
    const writes = {
      createDraft: jest.fn().mockRejectedValue(new Error('Failed write')),
      saveDraft: jest.fn(),
    } satisfies jest.Mocked<NewsDraftTransaction>;
    const repository = new PrismaNewsRepository({} as PrismaService, writes);
    await expect(repository.createDraft(input)).rejects.toThrow('Failed write');
  });
  it('does not hide failed Wall writes', async () => {
    const writes = {
      create: jest.fn().mockRejectedValue(new Error('Failed write')),
      tombstone: jest.fn(),
    } satisfies jest.Mocked<ProfileWallTransaction>;
    const repository = new PrismaUserWallRepository(
      {} as PrismaService,
      writes,
    );
    await expect(
      repository.create({
        authorId: 'subject',
        profileOwnerId: 'subject',
        body: 'Post',
        imageMediaId: null,
      }),
    ).rejects.toThrow('Failed write');
  });
});
