/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation / Profile Assets E2E
 * 📄 File: apps/api/test/reputation-profile-assets.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies real composed policy, GraphQL compatibility and cross-owner transaction rollback.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import {
  PROFILE_ASSET_TRANSACTION,
  type ProfileAssetTransaction,
  type ProfileAssetSlot,
} from '@api/modules/media';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { ReputationService } from '../src/modules/reputation/application/services/reputation.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';
describe('Reputation and profile assets composed boundaries (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let reputation: ReputationService;
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
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true,
      }),
    );
    await app.init();
    reputation = app.get(ReputationService);
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    await app?.close();
    await fixture?.close();
  });
  async function register() {
    const suffix = randomUUID();
    const authentication = app.get(AuthenticationPresentationService);
    const identity = await authentication.register({
      email: `profile-${suffix}@dss.test`,
      username: `profile-${suffix}`,
      displayName: 'Profile Pilot',
      password: 'profile-boundary-fixture-123',
    });
    await prisma.user.update({
      where: { id: identity.user.id },
      data: { createdAt: new Date('2020-01-01') },
    });
    return identity;
  }
  async function graphql(
    token: string,
    query: string,
    variables: Record<string, unknown> = {},
  ) {
    return request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query, variables })
      .expect(200);
  }
  async function media(ownerId: string) {
    const key = randomUUID();
    return prisma.media.create({
      data: {
        ownerId,
        kind: 'IMAGE',
        status: 'READY',
        visibility: 'PUBLIC',
        storageProvider: 'LOCAL',
        bucket: 'boundary-fixture',
        storageKey: key,
        originalFilename: 'fixture.webp',
        mimeType: 'image/webp',
        extension: 'webp',
        size: 100,
        checksum: key,
        variants: {
          create: ['avatar-256', 'cover-1280'].map((name) => ({
            name,
            storageProvider: 'LOCAL' as const,
            bucket: 'boundary-fixture',
            storageKey: `${key}/${name}`,
            mimeType: 'image/webp',
            extension: 'webp',
            size: 100,
            checksum: key,
          })),
        },
      },
    });
  }
  function setMutation(slot: ProfileAssetSlot) {
    return slot === 'AVATAR' ? 'setViewerAvatar' : 'setViewerCover';
  }
  function removeMutation(slot: ProfileAssetSlot) {
    return slot === 'AVATAR' ? 'removeViewerAvatar' : 'removeViewerCover';
  }
  const viewerFields =
    'id email username displayName bio location website technologies interests avatarUrl coverUrl status emailVerifiedAt lastSeenAt createdAt updatedAt followerCount followingCount isFollowedByViewer isOnline';
  async function assign(
    slot: ProfileAssetSlot,
    token: string,
    mediaId: string,
  ) {
    const name = setMutation(slot);
    return graphql(
      token,
      `mutation($id:ID!){${name}(mediaId:$id){${viewerFields}}}`,
      { id: mediaId },
    );
  }
  it('retains explainable reputation and atomic cooldown through the composed evidence ports', async () => {
    const actor = await register();
    const recipient = await register();
    const results = await Promise.allSettled([
      reputation.give(
        actor.user.id,
        recipient.user.id,
        1,
        'Helpful contributor',
      ),
      reputation.give(
        actor.user.id,
        recipient.user.id,
        1,
        'Helpful contributor',
      ),
    ]);
    expect(
      results.filter((value) => value.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(results.filter((value) => value.status === 'rejected')).toHaveLength(
      1,
    );
    expect(
      await prisma.reputationEntry.count({
        where: { actorId: actor.user.id, recipientId: recipient.user.id },
      }),
    ).toBe(1);
    const response = await graphql(
      actor.tokens.accessToken,
      'query($id:ID!){reputationHistory(userId:$id){score total items{reason value actor{id username}}}}',
      { id: recipient.user.id },
    );
    expect(response.body as object).toMatchObject({
      data: {
        reputationHistory: {
          score: 1,
          total: 1,
          items: [
            {
              reason: 'Helpful contributor',
              value: 1,
              actor: { id: actor.user.id, username: actor.user.username },
            },
          ],
        },
      },
    });
  });
  it('retains current actor/recipient eligibility, age, both block directions and history existence semantics', async () => {
    const actor = await register();
    const recipient = await register();
    for (const status of ['BANNED', 'DEACTIVATED', 'DELETED'] as const) {
      await prisma.user.update({
        where: { id: actor.user.id },
        data: { status },
      });
      await expect(
        reputation.give(actor.user.id, recipient.user.id, 1, 'Helpful answer'),
      ).rejects.toThrow('The reputation actor is not active.');
      await prisma.user.update({
        where: { id: actor.user.id },
        data: { status: 'ACTIVE' },
      });
      await prisma.user.update({
        where: { id: recipient.user.id },
        data: { status },
      });
      await expect(
        reputation.give(actor.user.id, recipient.user.id, 1, 'Helpful answer'),
      ).rejects.toThrow('The reputation recipient is not active.');
      await expect(
        reputation.history(recipient.user.id),
      ).resolves.toMatchObject({ total: 0 });
    }
    await prisma.user.update({
      where: { id: recipient.user.id },
      data: { status: 'ACTIVE' },
    });
    await prisma.user.update({
      where: { id: actor.user.id },
      data: { createdAt: new Date() },
    });
    await expect(
      reputation.give(actor.user.id, recipient.user.id, 1, 'Helpful answer'),
    ).rejects.toThrow('Your account must be at least');
    await prisma.user.update({
      where: { id: actor.user.id },
      data: { createdAt: new Date('2020-01-01') },
    });
    for (const [blockerId, blockedId] of [
      [actor.user.id, recipient.user.id],
      [recipient.user.id, actor.user.id],
    ]) {
      const block = await prisma.userBlock.create({
        data: { blockerId, blockedId },
      });
      await expect(
        reputation.give(actor.user.id, recipient.user.id, 1, 'Helpful answer'),
      ).rejects.toThrow('Reputation is unavailable between blocked users.');
      await prisma.userBlock.update({
        where: { id: block.id },
        data: { deletedAt: new Date() },
      });
    }
    expect(
      await prisma.reputationEntry.count({ where: { actorId: actor.user.id } }),
    ).toBe(0);
  });
  it.each(['AVATAR', 'COVER'] as const)(
    'preserves %s mutation response, audit/reference lifecycle and removal',
    async (slot) => {
      const identity = await register();
      const candidate = await media(identity.user.id);
      const response = await assign(
        slot,
        identity.tokens.accessToken,
        candidate.id,
      );
      const name = setMutation(slot);
      const body = response.body as {
        errors?: unknown[];
        data: Record<string, Record<string, unknown>>;
      };
      expect(body.errors).toBeUndefined();
      const data = body.data[name];
      const subject = await prisma.user.findUniqueOrThrow({
        where: { id: identity.user.id },
      });
      const purpose = slot === 'AVATAR' ? 'avatar' : 'cover';
      const url = `/api/media/public/${candidate.id}/${slot === 'AVATAR' ? 'avatar-256' : 'cover-1280'}`;
      expect(data).toMatchObject({
        id: subject.id,
        email: subject.email,
        username: subject.username,
        [`${purpose}Url`]: url,
        createdAt: subject.createdAt.toISOString(),
        updatedAt: subject.updatedAt.toISOString(),
        followerCount: 0,
        followingCount: 0,
        isFollowedByViewer: false,
        isOnline: false,
      });
      expect(
        await prisma.mediaReference.count({
          where: { targetId: subject.id, purpose, removedAt: null },
        }),
      ).toBe(1);
      expect(
        await prisma.auditRecord.count({
          where: { actorId: subject.id, action: `user.${purpose}.assigned` },
        }),
      ).toBe(1);
      const removed = await graphql(
        identity.tokens.accessToken,
        `mutation{${removeMutation(slot)}{id avatarUrl coverUrl}}`,
      );
      expect((removed.body as { errors?: unknown[] }).errors).toBeUndefined();
      const projected = (
        removed.body as { data: Record<string, Record<string, unknown>> }
      ).data[removeMutation(slot)];
      if (slot === 'AVATAR')
        expect(projected.avatarUrl).toBe(
          `/api/media/avatars/fallback/${encodeURIComponent(subject.username)}.svg`,
        );
      else expect(projected.coverUrl).toBeNull();
      expect(
        await prisma.mediaReference.count({
          where: { targetId: subject.id, purpose, removedAt: null },
        }),
      ).toBe(0);
      expect(
        await prisma.auditRecord.count({
          where: { actorId: subject.id, action: `user.${purpose}.removed` },
        }),
      ).toBe(1);
    },
  );
  it('denies foreign and invalid Media without changing the profile', async () => {
    const owner = await register();
    const other = await register();
    const candidate = await media(owner.user.id);
    const foreign = await assign(
      'AVATAR',
      other.tokens.accessToken,
      candidate.id,
    );
    expect(
      (foreign.body as { errors: Array<{ extensions: { code: string } }> })
        .errors[0].extensions.code,
    ).toBe('FORBIDDEN');
    await prisma.media.update({
      where: { id: candidate.id },
      data: { visibility: 'PRIVATE' },
    });
    const invalid = await assign(
      'COVER',
      owner.tokens.accessToken,
      candidate.id,
    );
    expect(
      (invalid.body as { errors: Array<{ extensions: { code: string } }> })
        .errors[0].extensions.code,
    ).toBe('BAD_USER_INPUT');
    expect(
      await prisma.mediaReference.count({ where: { mediaId: candidate.id } }),
    ).toBe(0);
  });
  it.each(['AVATAR', 'COVER'] as const)(
    'rolls %s profile/reference changes back together when audit fails',
    async (slot) => {
      const identity = await register();
      const original = await media(identity.user.id);
      const replacement = await media(identity.user.id);
      const first = await assign(
        slot,
        identity.tokens.accessToken,
        original.id,
      );
      expect((first.body as { errors?: unknown[] }).errors).toBeUndefined();
      const before = await prisma.user.findUniqueOrThrow({
        where: { id: identity.user.id },
      });
      const purpose = slot === 'AVATAR' ? 'avatar' : 'cover';
      const append = jest
        .spyOn(app.get(AuditWriterService), 'append')
        .mockRejectedValue(new Error('Synthetic asset audit failure'));
      try {
        const denied = await assign(
          slot,
          identity.tokens.accessToken,
          replacement.id,
        );
        expect(
          (denied.body as { errors: Array<{ extensions: { code: string } }> })
            .errors[0].extensions.code,
        ).toBe('INTERNAL_SERVER_ERROR');
        const deniedRemoval = await graphql(
          identity.tokens.accessToken,
          `mutation{${removeMutation(slot)}{id}}`,
        );
        expect(
          (
            deniedRemoval.body as {
              errors: Array<{ extensions: { code: string } }>;
            }
          ).errors[0].extensions.code,
        ).toBe('INTERNAL_SERVER_ERROR');
      } finally {
        append.mockRestore();
      }
      expect(
        await prisma.user.findUnique({ where: { id: identity.user.id } }),
      ).toEqual(before);
      expect(
        await prisma.mediaReference.count({
          where: {
            targetId: identity.user.id,
            purpose,
            mediaId: original.id,
            removedAt: null,
          },
        }),
      ).toBe(1);
      expect(
        await prisma.mediaReference.count({
          where: {
            targetId: identity.user.id,
            purpose,
            mediaId: replacement.id,
          },
        }),
      ).toBe(0);
      expect(
        await prisma.auditRecord.count({
          where: {
            actorId: identity.user.id,
            action: `user.${purpose}.assigned`,
          },
        }),
      ).toBe(1);
    },
  );
  it('retains the in-transaction candidate recheck and rejects unknown slots', async () => {
    const identity = await register();
    const candidate = await media(identity.user.id);
    await prisma.media.update({
      where: { id: candidate.id },
      data: { status: 'REJECTED' },
    });
    const transaction = app.get<ProfileAssetTransaction>(
      PROFILE_ASSET_TRANSACTION,
    );
    for (const slot of ['AVATAR', 'COVER'] as const) {
      await expect(
        transaction.assign({
          slot,
          subjectId: identity.user.id,
          actorId: identity.user.id,
          mediaId: candidate.id,
          url: 'fixture',
        }),
      ).rejects.toThrow('media changed before it could be assigned.');
    }
    await expect(
      transaction.remove(
        'UNKNOWN' as ProfileAssetSlot,
        identity.user.id,
        identity.user.id,
      ),
    ).rejects.toThrow('Unknown profile asset slot.');
    expect(
      await prisma.mediaReference.count({ where: { mediaId: candidate.id } }),
    ).toBe(0);
  });
});
