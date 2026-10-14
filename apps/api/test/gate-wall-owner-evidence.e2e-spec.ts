/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Owner Evidence E2E
 * 📄 File: apps/api/test/gate-wall-owner-evidence.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies gate statistics and Wall eligibility through actual owner contracts and migrated PostgreSQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { createEmptyEditorDocument } from '@dss/editor';
import type { MediaKind, MediaStatus, MediaVisibility } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import {
  CONTENT_AUDIENCE_READER,
  type ContentAudienceReader,
} from '@api/modules/content-access';
import {
  COMMENT_COUNT_READER,
  type CommentCountReader,
} from '@api/modules/interactions';
import {
  REPUTATION_TOTAL_READER,
  type ReputationTotalReader,
} from '@api/modules/reputation';
import {
  MEDIA_IMAGE_ELIGIBILITY,
  type MediaImageEligibility,
} from '@api/modules/media';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { ContentGatesService } from '../src/modules/content-access/application/services/content-gates.service';
import { ContentGateViewerFactsService } from '../src/modules/content-access/application/services/content-gate-viewer-facts.service';
import { UserWallService } from '../src/modules/users/application/services/user-wall.service';
import { UserBlockService } from '../src/modules/users/application/services/user-block.service';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Gate and Wall owner evidence with migrated PostgreSQL (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let owner: Awaited<ReturnType<typeof register>>;
  let viewer: Awaited<ReturnType<typeof register>>;
  let facts: ContentGateViewerFactsService;
  let gates: ContentGatesService;
  let wall: UserWallService;
  const presenceRefreshes: Promise<void>[] = [];
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    prisma = fixture.prisma;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: () => Promise.resolve('') })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    owner = await register();
    viewer = await register();
    facts = app.get(ContentGateViewerFactsService);
    gates = app.get(ContentGatesService);
    wall = app.get(UserWallService);
  }, 60000);
  beforeEach(() => {
    const presence = app.get(UserPresenceService);
    const touch = presence.touch.bind(presence) as UserPresenceService['touch'];
    const touchAnonymous = presence.touchAnonymous.bind(
      presence,
    ) as UserPresenceService['touchAnonymous'];
    jest.spyOn(presence, 'touch').mockImplementation((...args) => {
      const refresh = touch(...args);
      presenceRefreshes.push(refresh);
      return refresh;
    });
    jest.spyOn(presence, 'touchAnonymous').mockImplementation((...args) => {
      const refresh = touchAnonymous(...args);
      presenceRefreshes.push(refresh);
      return refresh;
    });
  });
  afterEach(async () => {
    // HTTP responses do not await the real presence side effect. Drain it before pool teardown.
    try {
      await Promise.all(presenceRefreshes.splice(0));
    } finally {
      jest.restoreAllMocks();
    }
  });
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });
  async function register() {
    const id = randomUUID();
    return app.get(AuthenticationPresentationService).register({
      email: 'evidence-' + id + '@dss.test',
      username: 'evidence-' + id,
      displayName: 'Evidence Pilot',
      password: 'evidence-boundary-fixture-123',
    });
  }
  async function asset(
    options: {
      ownerId?: string | null;
      kind?: MediaKind;
      status?: MediaStatus;
      visibility?: MediaVisibility;
      deletedAt?: Date | null;
    } = {},
  ) {
    const id = randomUUID();
    return prisma.media.create({
      data: {
        ownerId: viewer.user.id,
        kind: 'IMAGE',
        status: 'READY',
        visibility: 'PRIVATE',
        storageProvider: 'LOCAL',
        bucket: 'evidence-fixture',
        storageKey: id,
        originalFilename: 'private.webp',
        mimeType: 'image/webp',
        extension: 'webp',
        size: 100,
        checksum: id,
        metadata: { private: 'not for consumers' },
        ...options,
      },
    });
  }
  async function gate(kind: 'COMMENTS' | 'REPUTATION', threshold: number) {
    return gates.create({
      ownerId: owner.user.id,
      operator: 'ALL',
      requirements: [{ kind, threshold, groupKey: null }],
    });
  }
  it('reads only current scalar facts, including non-tombstoned comments on a locked target and compensating ledger entries', async () => {
    await prisma.user.update({
      where: { id: viewer.user.id },
      data: { createdAt: new Date('2026-10-01T12:00:01Z') },
    });
    const target = await prisma.interactionTarget.create({
      data: {
        kind: 'fixture.article',
        ownerModule: 'fixture',
        ownerType: 'Fixture',
        ownerId: randomUUID(),
        status: 'LOCKED',
      },
    });
    for (const deletedAt of [null, null, new Date()]) {
      const reaction = await prisma.interactionTarget.create({
        data: {
          kind: 'interactions.comment',
          ownerModule: 'interactions',
          ownerType: 'Comment',
          ownerId: randomUUID(),
        },
      });
      await prisma.comment.create({
        data: {
          interactionTargetId: target.id,
          reactionTargetId: reaction.id,
          authorId: viewer.user.id,
          body: deletedAt ? null : 'Private fixture body',
          document: deletedAt
            ? Prisma.DbNull
            : (createEmptyEditorDocument(
                'COMMENT',
              ) as unknown as Prisma.InputJsonValue),
          searchText: deletedAt ? null : 'Private fixture body',
          deletedAt,
          deletedById: deletedAt ? owner.user.id : null,
          deleteReason: deletedAt ? 'Fixture tombstone' : null,
        },
      });
    }
    const positive = await prisma.reputationEntry.create({
      data: {
        actorId: owner.user.id,
        recipientId: viewer.user.id,
        value: 1,
        reason: 'Fixture positive',
      },
    });
    await prisma.reputationEntry.create({
      data: {
        actorId: owner.user.id,
        recipientId: viewer.user.id,
        value: -1,
        reason: 'Fixture reversal',
        reversesEntryId: positive.id,
      },
    });
    await prisma.reputationEntry.create({
      data: {
        actorId: owner.user.id,
        recipientId: viewer.user.id,
        value: -1,
        reason: 'Fixture negative',
      },
    });
    expect(
      await facts.read(viewer.user.id, new Date('2026-10-14T12:00:00Z')),
    ).toEqual({
      accountAgeDays: 12,
      comments: 2,
      forumPosts: 0,
      publications: 0,
      reputation: -1,
    });
    expect(
      await app
        .get<CommentCountReader>(COMMENT_COUNT_READER)
        .countByAuthor(viewer.user.id),
    ).toBe(2);
    expect(
      await app
        .get<ReputationTotalReader>(REPUTATION_TOTAL_READER)
        .totalFor(viewer.user.id),
    ).toBe(-1);
    const commentGate = await gate('COMMENTS', 2);
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + viewer.tokens.accessToken)
      .send({
        query:
          'query($id: ID!) { evaluateContentGate(id:$id) { allowed bypassed unmet notice } }',
        variables: { id: commentGate.id },
      })
      .expect(200);
    const body = response.body as {
      errors?: unknown[];
      data: {
        evaluateContentGate: {
          allowed: boolean;
          bypassed: boolean;
          unmet: string[];
        };
      };
    };
    expect(body.errors).toBeUndefined();
    expect(body.data.evaluateContentGate).toMatchObject({
      allowed: true,
      bypassed: false,
      unmet: [],
    });
    expect(
      await gates.evaluate((await gate('REPUTATION', 0)).id, viewer.user.id),
    ).toMatchObject({ allowed: false, unmet: ['REPUTATION'] });
  });
  it.each(['BANNED', 'DEACTIVATED', 'DELETED'] as const)(
    'rejects %s before reading ledger evidence or applying author bypass',
    async (status) => {
      const subject = await register();
      const ownGate = await gates.create({
        ownerId: subject.user.id,
        operator: 'ALL',
        requirements: [{ kind: 'COMMENTS', threshold: 999, groupKey: null }],
      });
      await prisma.user.update({
        where: { id: subject.user.id },
        data: { status },
      });
      const comments = jest.spyOn(
        app.get<CommentCountReader>(COMMENT_COUNT_READER),
        'countByAuthor',
      );
      const reputation = jest.spyOn(
        app.get<ReputationTotalReader>(REPUTATION_TOTAL_READER),
        'totalFor',
      );
      expect(await facts.read(subject.user.id, new Date())).toBeNull();
      await expect(gates.evaluate(ownGate.id, subject.user.id)).rejects.toThrow(
        'Content Gate viewer was not found.',
      );
      expect(comments).not.toHaveBeenCalled();
      expect(reputation).not.toHaveBeenCalled();
    },
  );
  it('returns missing account evidence and avoids statistics reads for guests', async () => {
    expect(await facts.read(randomUUID(), new Date())).toBeNull();
    const read = jest.spyOn(facts, 'read');
    expect(
      await gates.evaluate((await gate('COMMENTS', 0)).id, null),
    ).toMatchObject({ allowed: false, bypassed: false });
    expect(read).not.toHaveBeenCalled();
  });
  it.each(['PUBLIC', 'PRIVATE', 'AUTHENTICATED', 'RESTRICTED'] as const)(
    'preserves owned READY image eligibility for %s visibility and GraphQL post creation',
    async (visibility) => {
      const media = await asset({ visibility });
      expect(
        await app
          .get<MediaImageEligibility>(MEDIA_IMAGE_ELIGIBILITY)
          .isAttachableImage(media.id, viewer.user.id),
      ).toBe(true);
      const response = await request(app.getHttpServer())
        .post('/api/graphql')
        .set('Authorization', 'Bearer ' + viewer.tokens.accessToken)
        .send({
          query:
            'mutation($input: CreateWallPostInput!) { createProfileWallPost(input:$input) { id imageMediaId isDeleted } }',
          variables: {
            input: { profileOwnerId: owner.user.id, imageMediaId: media.id },
          },
        })
        .expect(200);
      const body = response.body as {
        errors?: unknown[];
        data: {
          createProfileWallPost: {
            id: string;
            imageMediaId: string;
            isDeleted: boolean;
          };
        };
      };
      expect(body.errors).toBeUndefined();
      const result = body.data.createProfileWallPost;
      expect(result).toMatchObject({
        imageMediaId: media.id,
        isDeleted: false,
      });
      expect(
        await prisma.mediaReference.count({
          where: { mediaId: media.id, targetId: result.id, removedAt: null },
        }),
      ).toBe(1);
      const removed = await wall.remove(
        viewer.user.id,
        result.id,
        'Fixture removal',
      );
      expect(removed).toMatchObject({
        isDeleted: true,
        body: null,
        imageMediaId: null,
      });
      expect(
        await prisma.mediaReference.count({
          where: { mediaId: media.id, targetId: result.id, removedAt: null },
        }),
      ).toBe(0);
    },
  );
  it.each([
    'PENDING',
    'UPLOADING',
    'PROCESSING',
    'FAILED',
    'REJECTED',
    'QUARANTINED',
    'DELETING',
    'DELETED',
  ] as const)(
    'rejects %s images without a Wall or target write',
    async (status) => {
      const media = await asset({ status });
      const posts = await prisma.userWallPost.count();
      const targets = await prisma.interactionTarget.count();
      await expect(
        wall.create(viewer.user.id, owner.user.id, null, media.id),
      ).rejects.toThrow(
        'The wall image must be a READY image owned by the author.',
      );
      expect(await prisma.userWallPost.count()).toBe(posts);
      expect(await prisma.interactionTarget.count()).toBe(targets);
      expect(
        await prisma.mediaReference.count({ where: { mediaId: media.id } }),
      ).toBe(0);
    },
  );
  it.each(['foreign', 'system', 'deleted', 'non-image', 'missing'])(
    'rejects %s image evidence',
    async (kind) => {
      const media =
        kind === 'missing'
          ? { id: randomUUID() }
          : await asset(
              kind === 'foreign'
                ? { ownerId: owner.user.id }
                : kind === 'system'
                  ? { ownerId: null }
                  : kind === 'deleted'
                    ? { deletedAt: new Date() }
                    : { kind: 'DOCUMENT' },
            );
      expect(
        await app
          .get<MediaImageEligibility>(MEDIA_IMAGE_ELIGIBILITY)
          .isAttachableImage(media.id, viewer.user.id),
      ).toBe(false);
      await expect(
        wall.create(viewer.user.id, owner.user.id, null, media.id),
      ).rejects.toThrow(
        'The wall image must be a READY image owned by the author.',
      );
    },
  );
  it('preserves block-before-image ordering in both directions', async () => {
    const media = await asset();
    const blocks = app.get(UserBlockService);
    const images = jest.spyOn(
      app.get<MediaImageEligibility>(MEDIA_IMAGE_ELIGIBILITY),
      'isAttachableImage',
    );
    for (const [actor, target] of [
      [owner.user.id, viewer.user.id],
      [viewer.user.id, owner.user.id],
    ]) {
      await blocks.block(actor, target);
      await expect(
        wall.create(viewer.user.id, owner.user.id, null, media.id),
      ).rejects.toThrow('Profile Wall access is blocked.');
      await blocks.unblock(actor, target);
    }
    expect(images).not.toHaveBeenCalled();
  });
  it('propagates owner provider failures without creating a post or allowing a gate', async () => {
    const media = await asset();
    const posts = await prisma.userWallPost.count();
    jest
      .spyOn(
        app.get<MediaImageEligibility>(MEDIA_IMAGE_ELIGIBILITY),
        'isAttachableImage',
      )
      .mockRejectedValue(new Error('Media unavailable'));
    await expect(
      wall.create(viewer.user.id, owner.user.id, null, media.id),
    ).rejects.toThrow('Media unavailable');
    expect(await prisma.userWallPost.count()).toBe(posts);
    const comments = app.get<CommentCountReader>(COMMENT_COUNT_READER);
    const countByAuthor = comments.countByAuthor.bind(
      comments,
    ) as CommentCountReader['countByAuthor'];
    let pendingCount: Promise<number> | undefined;
    const audience = app.get<ContentAudienceReader>(CONTENT_AUDIENCE_READER);
    const readAudience = audience.read.bind(
      audience,
    ) as ContentAudienceReader['read'];
    let pendingAudience: ReturnType<ContentAudienceReader['read']> | undefined;
    jest.spyOn(audience, 'read').mockImplementation((...args) => {
      pendingAudience = readAudience(...args);
      return pendingAudience;
    });
    jest.spyOn(comments, 'countByAuthor').mockImplementation((id) => {
      pendingCount = countByAuthor(id);
      return pendingCount;
    });
    jest
      .spyOn(
        app.get<ReputationTotalReader>(REPUTATION_TOTAL_READER),
        'totalFor',
      )
      .mockRejectedValue(new Error('Reputation unavailable'));
    await expect(
      gates.evaluate((await gate('REPUTATION', 0)).id, viewer.user.id),
    ).rejects.toThrow('Reputation unavailable');
    // Promise.all preserves early rejection; the sibling real count must settle before pool teardown.
    await Promise.all([pendingCount, pendingAudience]);
  });
});
