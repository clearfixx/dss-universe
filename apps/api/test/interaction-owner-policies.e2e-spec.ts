/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Policy E2E
 * 📄 File: apps/api/test/interaction-owner-policies.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies real owner registration, minimal routing and unchanged capability/privacy decisions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { createEmptyEditorDocument } from '@dss/editor';
import { PrismaService } from '@api/core/database';
import {
  NEWS_INTERACTION_DECISIONS,
  type NewsInteractionDecisions,
} from '@api/modules/news';
import {
  PROFILE_WALL_INTERACTION_DECISIONS,
  type ProfileWallInteractionDecisions,
} from '@api/modules/users';
import {
  INTERACTION_POLICY_REGISTRATIONS,
  type InteractionPolicyRegistrations,
} from '@api/modules/interactions';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { InteractionOwnerBindingsService } from '../src/composition/interaction-policies/interaction-owner-bindings.service';
import { InteractionTargetsService } from '../src/modules/interactions/application/services/interaction-targets.service';
import { CommentInteractionPolicy } from '../src/modules/interactions/application/services/comment-interaction.policy';
import { CommentsService } from '../src/modules/interactions/application/services/comments.service';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { UserWallService } from '../src/modules/users/application/services/user-wall.service';
import { UserBlockService } from '../src/modules/users/application/services/user-block.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Interaction owner policy composition (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let owner: Awaited<ReturnType<typeof register>>;
  let viewer: Awaited<ReturnType<typeof register>>;
  let targets: InteractionTargetsService;
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
    targets = app.get(InteractionTargetsService);
  }, 60_000);
  afterAll(async () => {
    jest.restoreAllMocks();
    await app?.close();
    await fixture?.close();
  });
  async function register() {
    const suffix = randomUUID();
    const authentication = app.get(AuthenticationPresentationService);
    return authentication.register({
      email: 'policy-' + suffix + '@dss.test',
      username: 'policy-' + suffix,
      displayName: 'Policy Pilot',
      password: 'policy-boundary-fixture-123',
    });
  }
  async function article() {
    const news = app.get(NewsService);
    const created = await news.createDraft({
      authorId: owner.user.id,
      postType: 'STANDARD',
      visibility: 'PUBLIC',
      language: 'uk',
      slug: 'policy-' + randomUUID(),
      title: 'Policy fixture',
      shortText: 'Policy fixture description',
      documentJson: JSON.stringify(createEmptyEditorDocument('NEWS')),
      coverMediaId: null,
    });
    await prisma.newsArticle.update({
      where: { id: created.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    return created;
  }
  async function access(
    targetId: string,
    token: string,
    capability: 'READ' | 'COMMENT' | 'REACT' | 'BOOKMARK' = 'READ',
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + token)
      .send({
        query:
          'query($targetId: ID!, $capability: InteractionCapability!) { interactionTargetAccess(targetId: $targetId, capability: $capability) { allowed reason target { id ownerId } } }',
        variables: { targetId, capability },
      })
      .expect(200);
    return response.body as {
      data: {
        interactionTargetAccess: { allowed: boolean; reason: string | null };
      } | null;
      errors?: unknown[];
    };
  }
  it('registers the real News owner and retains GraphQL decisions', async () => {
    const news = await article();
    const response = await access(
      news.interactionTargetId,
      viewer.tokens.accessToken,
    );
    expect(response.errors).toBeUndefined();
    expect(response.data!.interactionTargetAccess).toMatchObject({
      allowed: true,
      reason: null,
    });
  });
  it.each([
    'DRAFT',
    'IN_REVIEW',
    'CHANGES_REQUESTED',
    'APPROVED',
    'SCHEDULED',
    'ARCHIVED',
  ] as const)(
    'denies %s News through the composed GraphQL route',
    async (status) => {
      const news = await article();
      await prisma.newsArticle.update({
        where: { id: news.id },
        data: { status },
      });
      expect(
        (await access(news.interactionTargetId, viewer.tokens.accessToken))
          .data!.interactionTargetAccess,
      ).toMatchObject({ allowed: false, reason: 'NEWS_NOT_PUBLISHED' });
    },
  );
  it.each([
    ['COMMENT', 'allowComments', 'NEWS_COMMENTS_DISABLED'],
    ['REACT', 'allowRating', 'NEWS_RATING_DISABLED'],
    ['SHARE', 'allowSharing', 'NEWS_SHARING_DISABLED'],
  ] as const)(
    'honors disabled News %s through the registered owner callback',
    async (capability, flag, reason) => {
      const news = await article();
      await prisma.newsArticle.update({
        where: { id: news.id },
        data: { [flag]: false },
      });
      expect(
        await targets.authorize(
          news.interactionTargetId,
          { kind: 'AUTHENTICATED', subjectId: viewer.user.id },
          capability,
        ),
      ).toMatchObject({ allowed: false, reason });
    },
  );
  it('preserves Wall private-profile owner bypass and blocks in both directions', async () => {
    const post = await app
      .get(UserWallService)
      .create(owner.user.id, owner.user.id, 'Private wall');
    await prisma.userPrivacySettings.upsert({
      where: { userId: owner.user.id },
      create: { userId: owner.user.id, profileVisibility: 'PRIVATE' },
      update: { profileVisibility: 'PRIVATE' },
    });
    try {
      expect(
        (await access(post.interactionTargetId, viewer.tokens.accessToken))
          .data!.interactionTargetAccess,
      ).toMatchObject({ allowed: false, reason: 'PROFILE_PRIVATE' });
      expect(
        (await access(post.interactionTargetId, owner.tokens.accessToken)).data!
          .interactionTargetAccess,
      ).toMatchObject({ allowed: true });
      const blocks = app.get(UserBlockService);
      for (const [actor, recipient] of [
        [owner.user.id, viewer.user.id],
        [viewer.user.id, owner.user.id],
      ]) {
        await blocks.block(actor, recipient);
        try {
          expect(
            await targets.authorize(
              post.interactionTargetId,
              { kind: 'AUTHENTICATED', subjectId: viewer.user.id },
              'READ',
            ),
          ).toMatchObject({ allowed: false, reason: 'PROFILE_BLOCKED' });
        } finally {
          await blocks.unblock(actor, recipient);
        }
      }
    } finally {
      await prisma.userPrivacySettings.update({
        where: { userId: owner.user.id },
        data: { profileVisibility: 'PUBLIC' },
      });
    }
  });
  it('retains lifecycle precedence before owner callbacks', async () => {
    const post = await app
      .get(UserWallService)
      .create(owner.user.id, owner.user.id, 'Lifecycle wall');
    await app
      .get(UserWallService)
      .remove(owner.user.id, post.id, 'Fixture retirement');
    const decisions = app.get<ProfileWallInteractionDecisions>(
      PROFILE_WALL_INTERACTION_DECISIONS,
    );
    const spy = jest.spyOn(decisions, 'authorize');
    try {
      expect(
        await targets.authorize(
          post.interactionTargetId,
          { kind: 'AUTHENTICATED', subjectId: viewer.user.id },
          'COMMENT',
        ),
      ).toMatchObject({ allowed: false, reason: 'TARGET_LOCKED' });
      expect(spy.mock.calls).toHaveLength(0);
      expect(
        await targets.authorize(
          post.interactionTargetId,
          { kind: 'AUTHENTICATED', subjectId: viewer.user.id },
          'READ',
        ),
      ).toMatchObject({ allowed: true });
      expect(spy.mock.calls).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });
  it.each(['PUBLIC', 'PRIVATE'] as const)(
    'preserves %s Wall guest/member/owner and inherited comment READ parity',
    async (visibility) => {
      const post = await app
        .get(UserWallService)
        .create(owner.user.id, owner.user.id, 'Synthetic Wall compatibility');
      const comment = await app
        .get(CommentsService)
        .create(owner.user.id, post.interactionTargetId, {
          body: 'Synthetic Wall child',
        });
      await prisma.userPrivacySettings.upsert({
        where: { userId: owner.user.id },
        create: { userId: owner.user.id, profileVisibility: visibility },
        update: { profileVisibility: visibility },
      });
      try {
        const wall = app.get<ProfileWallInteractionDecisions>(
          PROFILE_WALL_INTERACTION_DECISIONS,
        );
        for (const context of [
          { kind: 'GUEST' } as const,
          { kind: 'AUTHENTICATED', subjectId: viewer.user.id } as const,
          { kind: 'AUTHENTICATED', subjectId: owner.user.id } as const,
        ]) {
          const legacy = await wall.authorize({
            postId: post.id,
            interactionTargetId: post.interactionTargetId,
            viewerId:
              context.kind === 'GUEST' ? 'anonymous' : context.subjectId,
          });
          for (const targetId of [
            post.interactionTargetId,
            comment.reactionTargetId,
          ]) {
            const result = await targets.authorize(targetId, context, 'READ');
            expect({ allowed: result.allowed, reason: result.reason }).toEqual({
              allowed: legacy.allowed,
              reason: legacy.reason ?? null,
            });
          }
        }
      } finally {
        await prisma.userPrivacySettings.update({
          where: { userId: owner.user.id },
          data: { profileVisibility: 'PUBLIC' },
        });
      }
    },
  );
  it.each(['news.article', 'users.profile-wall-post'])(
    'denies missing %s owner coordinates',
    async (kind) => {
      const target = await prisma.interactionTarget.create({
        data: {
          kind,
          ownerModule: 'fixture',
          ownerType: 'PolicyFixture',
          ownerId: randomUUID(),
        },
      });
      expect(
        await targets.authorize(
          target.id,
          { kind: 'AUTHENTICATED', subjectId: viewer.user.id },
          'READ',
        ),
      ).toMatchObject({ allowed: false, reason: 'OWNER_RECORD_UNAVAILABLE' });
    },
  );
  it('denies mismatched News target identity even when the article exists', async () => {
    const news = await article();
    const target = await prisma.interactionTarget.create({
      data: {
        kind: 'news.article',
        ownerModule: 'news',
        ownerType: 'PolicyMismatchFixture',
        ownerId: news.id,
      },
    });
    expect(
      await targets.authorize(
        target.id,
        { kind: 'AUTHENTICATED', subjectId: viewer.user.id },
        'READ',
      ),
    ).toMatchObject({ allowed: false, reason: 'OWNER_RECORD_UNAVAILABLE' });
  });
  it('fails closed after unbinding owners, preserves private comment routing and recovers on rebind', async () => {
    const news = await article();
    const post = await app
      .get(UserWallService)
      .create(owner.user.id, owner.user.id, 'Binding wall');
    const comment = await app
      .get(CommentsService)
      .create(viewer.user.id, news.interactionTargetId, {
        body: 'Parent-gated comment',
      });
    const bindings = app.get(InteractionOwnerBindingsService);
    const commentSpy = jest.spyOn(
      app.get(CommentInteractionPolicy),
      'authorize',
    );
    bindings.onModuleDestroy();
    try {
      for (const targetId of [
        news.interactionTargetId,
        post.interactionTargetId,
        comment.reactionTargetId,
      ]) {
        expect(
          await targets.authorize(
            targetId,
            { kind: 'AUTHENTICATED', subjectId: viewer.user.id },
            'READ',
          ),
        ).toMatchObject({ allowed: false, reason: 'OWNER_POLICY_UNAVAILABLE' });
      }
      expect(commentSpy.mock.calls).toHaveLength(1);
    } finally {
      bindings.onModuleInit();
      commentSpy.mockRestore();
    }
    expect(
      await targets.authorize(
        comment.reactionTargetId,
        { kind: 'AUTHENTICATED', subjectId: viewer.user.id },
        'REACT',
      ),
    ).toMatchObject({ allowed: true });
  });
  it('rejects competing registered owners without overriding decisions', async () => {
    const news = await article();
    await prisma.newsArticle.update({
      where: { id: news.id },
      data: { allowComments: false },
    });
    const registrations = app.get<InteractionPolicyRegistrations>(
      INTERACTION_POLICY_REGISTRATIONS,
    );
    const rival = {
      kind: 'news.article',
      authorize: () => Promise.resolve({ allowed: true }),
    };
    expect(() => registrations.register(rival)).toThrow(
      'Interaction policy already owns kind news.article.',
    );
    registrations.unregister(rival);
    expect(
      await targets.authorize(
        news.interactionTargetId,
        { kind: 'AUTHENTICATED', subjectId: viewer.user.id },
        'COMMENT',
      ),
    ).toMatchObject({ allowed: false, reason: 'NEWS_COMMENTS_DISABLED' });
  });
  it('propagates an unavailable owner as an error, never a successful GraphQL allow', async () => {
    const news = await article();
    const spy = jest
      .spyOn(
        app.get<NewsInteractionDecisions>(NEWS_INTERACTION_DECISIONS),
        'authorize',
      )
      .mockRejectedValue(new Error('Synthetic owner unavailable'));
    try {
      const result = await access(
        news.interactionTargetId,
        viewer.tokens.accessToken,
      );
      expect(result.errors).toBeDefined();
      expect(result.data).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});
