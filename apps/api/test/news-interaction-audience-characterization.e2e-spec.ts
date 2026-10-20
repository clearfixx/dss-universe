/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Interaction Security
 * 📄 File: apps/api/test/news-interaction-audience-characterization.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Enforces article delivery eligibility on shared engagement routes.
 *
 * 🧠 Responsibilities:
 * • publishes synthetic articles through the real editorial workflow;
 * • uses actual JWT/session state and verifies persisted guest effects;
 * • rejects protected engagement without persisted effects or counters.
 *
 * 🏗️ Architecture:
 * AppModule HTTP security regressions in an owned fully migrated schema.
 *
 * ⚠️ Important:
 * No successful access grants are mocked. Known defect assertions are converted to denials.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { createEmptyEditorDocument } from '@dss/editor';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { Permission } from '@api/core/authorization';
import { PrismaService } from '@api/core/database';
import {
  NEWS_INTERACTION_DECISIONS,
  type NewsInteractionDecisions,
} from '@api/modules/news';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { NewsWorkflowService } from '../src/modules/news/application/services/news-workflow.service';
import { CommentsService } from '../src/modules/interactions/application/services/comments.service';
import { InteractionOwnerBindingsService } from '../src/composition/interaction-policies/interaction-owner-bindings.service';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
import { NEWS_ARTICLE_STATUSES } from '../src/modules/news/domain/types/news-article.type';
import { SHARE_CHANNELS } from '../src/modules/interactions/domain/types/audience-engagement.type';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type Result<T> = { errors?: { message: string }[]; data: T | null };
type Engagement = { changed: boolean; viewCount: number; shareCount: number };

describe('News interaction audience security (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication<App>;
  let author: Awaited<ReturnType<typeof register>>;
  let reviewer: Awaited<ReturnType<typeof register>>;
  let member: Awaited<ReturnType<typeof register>>;
  const presenceWrites: Promise<void>[] = [];

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    author = await register();
    reviewer = await register();
    member = await register();
    // Authoritative IAM fixture grants only editorial review/publication.
    for (const key of [Permission.NewsReview, Permission.NewsPublish]) {
      const permission = await fixture.prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, label: key },
      });
      await fixture.prisma.userPermission.create({
        data: { userId: reviewer.user.id, permissionId: permission.id },
      });
    }
  }, 60000);
  beforeEach(() => {
    const presence = app.get(UserPresenceService);
    const touch = presence.touch.bind(presence) as UserPresenceService['touch'];
    const anonymous = presence.touchAnonymous.bind(
      presence,
    ) as UserPresenceService['touchAnonymous'];
    jest.spyOn(presence, 'touch').mockImplementation((...args) => {
      const pending = touch(...args);
      presenceWrites.push(pending);
      return pending;
    });
    jest.spyOn(presence, 'touchAnonymous').mockImplementation((...args) => {
      const pending = anonymous(...args);
      presenceWrites.push(pending);
      return pending;
    });
  });
  afterEach(async () => {
    try {
      await Promise.all(presenceWrites.splice(0));
    } finally {
      jest.restoreAllMocks();
    }
  });
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await fixture?.close();
    }
  });
  async function register() {
    const id = randomUUID();
    return app.get(AuthenticationPresentationService).register({
      username: `audience-${id}`,
      email: `${id}@dss.test`,
      password: 'synthetic-audience-password-123',
    });
  }
  async function rejectedCredential(
    viewer:
      | 'guest'
      | 'invalid-token'
      | 'revoked-session'
      | 'expired-token'
      | 'disabled-account',
  ) {
    if (viewer === 'guest') return undefined;
    if (viewer === 'invalid-token') return 'synthetic-invalid-token';
    const identity = await register();
    if (viewer === 'expired-token') {
      const jwt = app.get(JwtService);
      const payload = jwt.decode<Record<string, unknown>>(
        identity.tokens.accessToken,
      );
      return jwt.sign(
        { ...payload, exp: Math.floor(Date.now() / 1000) - 60 },
        { secret: process.env.JWT_ACCESS_SECRET },
      );
    }
    if (viewer === 'revoked-session') {
      await fixture.prisma.session.updateMany({
        where: { userId: identity.user.id },
        data: { revokedAt: new Date() },
      });
    } else {
      await fixture.prisma.user.update({
        where: { id: identity.user.id },
        data: { status: 'BANNED' },
      });
    }
    return identity.tokens.accessToken;
  }
  async function article(visibility: 'PUBLIC' | 'MEMBERS', publish = true) {
    const document = createEmptyEditorDocument('NEWS');
    document.content.content = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Synthetic audience body.' }],
      },
    ];
    const draft = await app.get(NewsService).createDraft({
      authorId: author.user.id,
      postType: 'STANDARD',
      visibility,
      language: 'uk',
      slug: `audience-${randomUUID()}`,
      title: 'Synthetic audience headline',
      shortText: 'Synthetic audience description',
      documentJson: JSON.stringify(document),
      // Opaque synthetic cover coordinate: media processing is not under test.
      coverMediaId: randomUUID(),
    });
    if (!publish) return draft;
    const workflow = app.get(NewsWorkflowService);
    await workflow.submit(author.user.id, draft.id);
    await workflow.approve(reviewer.user.id, draft.id);
    const result = await workflow.publish(reviewer.user.id, draft.id);
    expect(result.article.publishedAt).not.toBeNull();
    expect(result.article.approvedVersion).toBe(result.article.currentVersion);
    return result.article;
  }
  async function graphql<T>(
    query: string,
    variables: Record<string, unknown>,
    token?: string,
  ): Promise<Result<T>> {
    const call = request(app.getHttpServer()).post('/api/graphql');
    if (token) call.set('Authorization', `Bearer ${token}`);
    const response = await call.send({ query, variables }).expect(200);
    return response.body as Result<T>;
  }
  async function full(slug: string, token?: string) {
    const result = await graphql<{ fullNews: { id: string } | null }>(
      'query($slug:String!){fullNews(language:"uk",slug:$slug){id}}',
      { slug },
      token,
    );
    expect(result.errors).toBeUndefined();
    return result.data?.fullNews;
  }
  function engage(
    kind: 'View' | 'Share',
    targetId: string,
    token?: string,
    visitorId = randomUUID(),
  ) {
    const channel = kind === 'Share' ? ', channel: COPY_LINK' : '';
    return graphql<{ result: Engagement }>(
      `mutation($targetId:ID!,$visitorId:String!){result:recordInteraction${kind}(input:{interactionTargetId:$targetId,visitorId:$visitorId${channel}}){changed viewCount shareCount}}`,
      { targetId, visitorId },
      token,
    );
  }
  it('retains PUBLIC guest engagement and per-visitor idempotency', async () => {
    const post = await article('PUBLIC');
    expect(await full(post.slug)).toEqual({ id: post.id });
    const visitor = randomUUID();
    const first = await engage(
      'View',
      post.interactionTargetId,
      undefined,
      visitor,
    );
    expect(first.errors).toBeUndefined();
    expect(first.data?.result).toEqual({
      changed: true,
      viewCount: 1,
      shareCount: 0,
    });
    expect(
      (await engage('View', post.interactionTargetId, undefined, visitor)).data
        ?.result.changed,
    ).toBe(false);
    expect(
      (await engage('Share', post.interactionTargetId)).data?.result.shareCount,
    ).toBe(1);
  });
  it('allows a current authenticated member to view and engage MEMBERS News', async () => {
    const post = await article('MEMBERS');
    expect(await full(post.slug, member.tokens.accessToken)).toEqual({
      id: post.id,
    });
    expect(
      (
        await engage(
          'View',
          post.interactionTargetId,
          member.tokens.accessToken,
        )
      ).data?.result.changed,
    ).toBe(true);
    expect(
      (
        await engage(
          'Share',
          post.interactionTargetId,
          member.tokens.accessToken,
        )
      ).data?.result.changed,
    ).toBe(true);
  });
  it.each([
    'guest',
    'invalid-token',
    'revoked-session',
    'expired-token',
    'disabled-account',
  ] as const)(
    'denies %s writing or reading engagement for inaccessible MEMBERS News',
    async (viewer) => {
      const post = await article('MEMBERS');
      const token = await rejectedCredential(viewer);
      await engage('View', post.interactionTargetId, member.tokens.accessToken);
      await engage(
        'Share',
        post.interactionTargetId,
        member.tokens.accessToken,
      );
      expect(await full(post.slug, token)).toBeNull();
      const view = await engage('View', post.interactionTargetId, token);
      const share = await engage('Share', post.interactionTargetId, token);
      expect(view.errors).toBeDefined();
      expect(share.errors).toBeDefined();
      expect(view.data).toBeNull();
      expect(share.data).toBeNull();
      expect(
        await fixture.prisma.interactionView.count({
          where: {
            interactionTargetId: post.interactionTargetId,
            actorId: null,
          },
        }),
      ).toBe(0);
      expect(
        await fixture.prisma.interactionShare.count({
          where: {
            interactionTargetId: post.interactionTargetId,
            actorId: null,
          },
        }),
      ).toBe(0);
    },
  );
  it('denies guest views inherited from a MEMBERS comment parent', async () => {
    const post = await article('MEMBERS');
    const comment = await app
      .get(CommentsService)
      .create(author.user.id, post.interactionTargetId, {
        body: 'Synthetic hidden comment',
      });
    const page = await graphql<{
      newsComments: { total: number; items: { id: string }[] };
    }>('query($id:ID!){newsComments(articleId:$id){total items{id}}}', {
      id: post.id,
    });
    expect(page.errors).toBeUndefined();
    expect(page.data?.newsComments).toEqual({ total: 0, items: [] });
    const result = await engage('View', comment.reactionTargetId);
    expect(result.errors).toBeDefined();
    expect(result.data).toBeNull();
    expect(
      await fixture.prisma.interactionView.count({
        where: { interactionTargetId: comment.reactionTargetId },
      }),
    ).toBe(0);
  });
  it('still denies unpublished articles and disabled sharing', async () => {
    const draft = await article('PUBLIC', false);
    expect(
      (await engage('View', draft.interactionTargetId)).errors,
    ).toBeDefined();
    expect(
      await fixture.prisma.interactionView.count({
        where: { interactionTargetId: draft.interactionTargetId },
      }),
    ).toBe(0);
    const post = await article('PUBLIC');
    await fixture.prisma.newsArticle.update({
      where: { id: post.id },
      data: { allowSharing: false },
    });
    expect(
      (await engage('Share', post.interactionTargetId)).errors,
    ).toBeDefined();
    expect(
      await fixture.prisma.interactionShare.count({
        where: { interactionTargetId: post.interactionTargetId },
      }),
    ).toBe(0);
  });
  it.each([
    'invalid-token',
    'revoked-session',
    'expired-token',
    'disabled-account',
  ] as const)('retains PUBLIC guest fallback for %s', async (viewer) => {
    const post = await article('PUBLIC');
    const token = await rejectedCredential(viewer);
    expect(await full(post.slug, token)).toEqual({ id: post.id });
    for (const kind of ['View', 'Share'] as const) {
      const response = await engage(kind, post.interactionTargetId, token);
      expect(response.errors).toBeUndefined();
      expect(response.data?.result.changed).toBe(true);
    }
    expect(
      await fixture.prisma.interactionView.count({
        where: { interactionTargetId: post.interactionTargetId, actorId: null },
      }),
    ).toBe(1);
    expect(
      await fixture.prisma.interactionShare.count({
        where: { interactionTargetId: post.interactionTargetId, actorId: null },
      }),
    ).toBe(1);
  });
  it.each(['PUBLIC', 'MEMBERS'] as const)(
    'preserves readable %s child views and rejects child sharing',
    async (visibility) => {
      const post = await article(visibility);
      const comment = await app
        .get(CommentsService)
        .create(author.user.id, post.interactionTargetId, {
          body: 'Synthetic readable child',
        });
      const response = await engage(
        'View',
        comment.reactionTargetId,
        member.tokens.accessToken,
      );
      expect(response.errors).toBeUndefined();
      expect(response.data?.result.changed).toBe(true);
      const guest = await engage('View', comment.reactionTargetId);
      if (visibility === 'PUBLIC') {
        expect(guest.errors).toBeUndefined();
        expect(guest.data?.result.changed).toBe(true);
      } else {
        expect(guest.errors).toBeDefined();
        expect(guest.data).toBeNull();
      }
      expect(
        (
          await engage(
            'Share',
            comment.reactionTargetId,
            member.tokens.accessToken,
          )
        ).errors,
      ).toBeDefined();
      expect(
        await fixture.prisma.interactionShare.count({
          where: { interactionTargetId: comment.reactionTargetId },
        }),
      ).toBe(0);
    },
  );
  it('rechecks visibility and session revocation on the next request', async () => {
    const post = await article('PUBLIC');
    const visitor = randomUUID();
    expect(
      (await engage('View', post.interactionTargetId, undefined, visitor)).data
        ?.result.changed,
    ).toBe(true);
    await fixture.prisma.newsArticle.update({
      where: { id: post.id },
      data: { visibility: 'MEMBERS' },
    });
    for (const kind of ['View', 'Share'] as const) {
      const denied = await engage(
        kind,
        post.interactionTargetId,
        undefined,
        visitor,
      );
      expect(denied.errors).toBeDefined();
      expect(denied.data).toBeNull();
    }
    const current = await register();
    expect(
      (
        await engage(
          'View',
          post.interactionTargetId,
          current.tokens.accessToken,
        )
      ).data?.result.changed,
    ).toBe(true);
    expect(
      (
        await engage(
          'View',
          post.interactionTargetId,
          current.tokens.accessToken,
        )
      ).data?.result.changed,
    ).toBe(false);
    await fixture.prisma.session.updateMany({
      where: { userId: current.user.id },
      data: { revokedAt: new Date() },
    });
    expect(
      (
        await engage(
          'View',
          post.interactionTargetId,
          current.tokens.accessToken,
        )
      ).errors,
    ).toBeDefined();
    expect(
      await fixture.prisma.interactionView.count({
        where: { interactionTargetId: post.interactionTargetId },
      }),
    ).toBe(2);
    expect(
      await fixture.prisma.interactionShare.count({
        where: { interactionTargetId: post.interactionTargetId },
      }),
    ).toBe(0);
  });
  it.each(['View', 'Share'] as const)(
    'keeps bounded SQL work and no protected engagement SQL for %s',
    async (kind) => {
      const post = await article('PUBLIC');
      await Promise.all(presenceWrites.splice(0));
      fixture.queries.length = 0;
      const allowed = await engage(kind, post.interactionTargetId);
      await Promise.all(presenceWrites.splice(0));
      expect(allowed.errors).toBeUndefined();
      const acceptedQueries = [...fixture.queries];
      expect(
        acceptedQueries.filter((sql) => sql.includes('"news_articles"')),
      ).toHaveLength(1);
      expect(
        acceptedQueries.filter((sql) =>
          /^INSERT INTO .*"interaction_(views|shares)"/.test(sql),
        ),
      ).toHaveLength(1);
      expect(
        acceptedQueries.filter((sql) =>
          /^SELECT .*"interaction_views"/.test(sql),
        ),
      ).toHaveLength(1);
      expect(
        acceptedQueries.filter((sql) =>
          /^SELECT .*"interaction_shares"/.test(sql),
        ),
      ).toHaveLength(2);
      await fixture.prisma.newsArticle.update({
        where: { id: post.id },
        data: { visibility: 'MEMBERS' },
      });
      fixture.queries.length = 0;
      const denied = await engage(kind, post.interactionTargetId);
      await Promise.all(presenceWrites.splice(0));
      expect(denied.errors).toBeDefined();
      expect(denied.data).toBeNull();
      expect(
        fixture.queries.filter((sql) => sql.includes('"news_articles"')),
      ).toHaveLength(1);
      expect(
        fixture.queries.filter((sql) =>
          /"interaction_(views|shares)"/.test(sql),
        ),
      ).toHaveLength(0);
    },
  );
  it('does not write or read counters when the News owner fails', async () => {
    const post = await article('PUBLIC');
    const spy = jest
      .spyOn(
        app.get<NewsInteractionDecisions>(NEWS_INTERACTION_DECISIONS),
        'authorize',
      )
      .mockRejectedValue(new Error('Synthetic News owner unavailable'));
    fixture.queries.length = 0;
    try {
      for (const kind of ['View', 'Share'] as const) {
        const response = await engage(kind, post.interactionTargetId);
        expect(response.errors).toBeDefined();
        expect(response.data).toBeNull();
      }
      await Promise.all(presenceWrites.splice(0));
      expect(
        fixture.queries.filter((sql) =>
          /"interaction_(views|shares)"/.test(sql),
        ),
      ).toHaveLength(0);
    } finally {
      spy.mockRestore();
    }
  });
  it('preserves every guest share channel and per-channel replay deduplication', async () => {
    const post = await article('PUBLIC');
    const visitorId = randomUUID();
    for (const channel of SHARE_CHANNELS) {
      const query = `mutation($targetId:ID!,$visitorId:String!){result:recordInteractionShare(input:{interactionTargetId:$targetId,visitorId:$visitorId,channel:${channel}}){changed shareCount shares{channel count}}}`;
      const variables = { targetId: post.interactionTargetId, visitorId };
      const first = await graphql<{ result: { changed: boolean } }>(
        query,
        variables,
      );
      expect(first.errors).toBeUndefined();
      expect(first.data?.result.changed).toBe(true);
      const replay = await graphql<{
        result: {
          changed: boolean;
          shareCount: number;
          shares: { channel: string; count: number }[];
        };
      }>(query, variables);
      expect(replay.errors).toBeUndefined();
      expect(replay.data?.result.changed).toBe(false);
      expect(
        replay.data?.result.shares.find((item) => item.channel === channel)
          ?.count,
      ).toBe(1);
    }
    expect(
      await fixture.prisma.interactionShare.count({
        where: { interactionTargetId: post.interactionTargetId, actorId: null },
      }),
    ).toBe(SHARE_CHANNELS.length);
  });
  it.each(NEWS_ARTICLE_STATUSES.filter((status) => status !== 'PUBLISHED'))(
    'denies %s to both guest and authenticated author',
    async (status) => {
      const post = await article('PUBLIC');
      await fixture.prisma.newsArticle.update({
        where: { id: post.id },
        data: { status },
      });
      for (const token of [undefined, author.tokens.accessToken]) {
        expect(await full(post.slug, token)).toBeNull();
        for (const kind of ['View', 'Share'] as const) {
          const response = await engage(kind, post.interactionTargetId, token);
          expect(response.errors).toBeDefined();
          expect(response.data).toBeNull();
        }
      }
      expect(
        await fixture.prisma.interactionView.count({
          where: { interactionTargetId: post.interactionTargetId },
        }),
      ).toBe(0);
      expect(
        await fixture.prisma.interactionShare.count({
          where: { interactionTargetId: post.interactionTargetId },
        }),
      ).toBe(0);
    },
  );
  it('preserves LOCKED read-only analytics and rejects every RETIRED event', async () => {
    const post = await article('PUBLIC');
    await fixture.prisma.interactionTarget.update({
      where: { id: post.interactionTargetId },
      data: { status: 'LOCKED' },
    });
    expect(
      (await engage('View', post.interactionTargetId)).data?.result.changed,
    ).toBe(true);
    expect(
      (await engage('Share', post.interactionTargetId)).errors,
    ).toBeDefined();
    await fixture.prisma.interactionTarget.update({
      where: { id: post.interactionTargetId },
      data: { status: 'RETIRED' },
    });
    for (const kind of ['View', 'Share'] as const) {
      const response = await engage(kind, post.interactionTargetId);
      expect(response.errors).toBeDefined();
      expect(response.data).toBeNull();
    }
    expect(
      await fixture.prisma.interactionView.count({
        where: { interactionTargetId: post.interactionTargetId },
      }),
    ).toBe(1);
    expect(
      await fixture.prisma.interactionShare.count({
        where: { interactionTargetId: post.interactionTargetId },
      }),
    ).toBe(0);
  });
  it('rejects unbound owners before engagement, then recovers on rebind', async () => {
    const post = await article('PUBLIC');
    const binding = app.get(InteractionOwnerBindingsService);
    binding.onModuleDestroy();
    try {
      for (const kind of ['View', 'Share'] as const) {
        const response = await engage(kind, post.interactionTargetId);
        expect(response.errors).toBeDefined();
        expect(response.data).toBeNull();
      }
      expect(
        await fixture.prisma.interactionView.count({
          where: { interactionTargetId: post.interactionTargetId },
        }),
      ).toBe(0);
      expect(
        await fixture.prisma.interactionShare.count({
          where: { interactionTargetId: post.interactionTargetId },
        }),
      ).toBe(0);
    } finally {
      binding.onModuleInit();
    }
    expect(
      (await engage('View', post.interactionTargetId)).data?.result.changed,
    ).toBe(true);
  });
  it.each(['missing', 'mismatched'] as const)(
    'rejects %s News owner coordinates without engagement effects',
    async (kind) => {
      const post = await article('PUBLIC');
      const target = await fixture.prisma.interactionTarget.create({
        data: {
          kind: 'news.article',
          ownerModule: 'news',
          ownerType: 'SyntheticNews',
          ownerId: kind === 'missing' ? randomUUID() : post.id,
        },
      });
      for (const action of ['View', 'Share'] as const) {
        const response = await engage(action, target.id);
        expect(response.errors).toBeDefined();
        expect(response.data).toBeNull();
      }
      expect(
        await fixture.prisma.interactionView.count({
          where: { interactionTargetId: target.id },
        }),
      ).toBe(0);
      expect(
        await fixture.prisma.interactionShare.count({
          where: { interactionTargetId: target.id },
        }),
      ).toBe(0);
    },
  );
  it('denies imported publication-time corruption instead of recording a view', async () => {
    const post = await article('PUBLIC');
    // Deliberately corrupted/imported state; no public way to create it is claimed.
    await fixture.prisma.newsArticle.update({
      where: { id: post.id },
      data: { publishedAt: null },
    });
    expect(await full(post.slug)).toBeNull();
    expect(
      (await engage('View', post.interactionTargetId)).errors,
    ).toBeDefined();
    expect(
      await fixture.prisma.interactionView.count({
        where: { interactionTargetId: post.interactionTargetId },
      }),
    ).toBe(0);
  });
});
