/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Delivery E2E
 * 📄 File: apps/api/test/news-comment-tombstone.e2e-spec.ts
 * 🎯 Purpose: Preserves null tombstones across real GraphQL comment pages.
 * 🧠 Responsibilities: verifies live descendants, pagination, audience and immutable evidence.
 * 🏗️ Architecture: Actual owner services and HTTP over an owned migrated schema.
 * ⚠️ Important: Presence side effects are isolated; access and comment persistence are real.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createEmptyEditorDocument } from '@dss/editor';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { CommentsService } from '../src/modules/interactions/application/services/comments.service';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type Item = {
  id: string;
  body: string | null;
  documentJson: string | null;
  isDeleted: boolean;
  children: Item[];
};
type Page = {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

describe('News GraphQL tombstones (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication<App>;
  let author: Awaited<ReturnType<typeof register>>;
  let member: Awaited<ReturnType<typeof register>>;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: () => Promise.resolve('') })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    jest
      .spyOn(app.get(UserPresenceService), 'touch')
      .mockResolvedValue(undefined);
    jest
      .spyOn(app.get(UserPresenceService), 'touchAnonymous')
      .mockResolvedValue(undefined);
    author = await register();
    member = await register();
  }, 60000);
  afterAll(async () => {
    jest.restoreAllMocks();
    await app?.close();
    await fixture?.close();
  });
  async function register() {
    const id = randomUUID();
    return app.get(AuthenticationPresentationService).register({
      email: `tombstone-${id}@dss.test`,
      username: `tombstone-${id}`,
      password: 'synthetic-tombstone-password-123',
    });
  }
  async function seed(visibility: 'PUBLIC' | 'MEMBERS' = 'PUBLIC') {
    const post = await app.get(NewsService).createDraft({
      authorId: author.user.id,
      postType: 'STANDARD',
      visibility,
      language: 'uk',
      slug: `tombstone-${randomUUID()}`,
      title: 'Synthetic tombstone news',
      shortText: 'Synthetic summary',
      coverMediaId: null,
      documentJson: JSON.stringify(createEmptyEditorDocument('NEWS')),
    });
    await fixture.prisma.newsArticle.update({
      where: { id: post.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    const comments = app.get(CommentsService);
    const marker = `SYNTHETIC-DELETED-${randomUUID()}`;
    const parent = await comments.create(
      author.user.id,
      post.interactionTargetId,
      { body: marker },
    );
    const reply = await comments.create(
      author.user.id,
      post.interactionTargetId,
      { body: 'Synthetic live reply' },
      parent.id,
    );
    const sibling = await comments.create(
      author.user.id,
      post.interactionTargetId,
      { body: 'Synthetic live sibling' },
    );
    await comments.remove(
      author.user.id,
      parent.id,
      'Synthetic deletion reason',
    );
    const expected = await fixture.prisma.comment.findMany({
      where: { interactionTargetId: post.interactionTargetId, parentId: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });
    return {
      post,
      parent,
      reply,
      sibling,
      marker,
      expected: expected.map((row) => row.id),
    };
  }
  async function read(id: string, token?: string, page = 1, pageSize = 20) {
    const call = request(app.getHttpServer()).post('/api/graphql');
    if (token) call.set('Authorization', `Bearer ${token}`);
    const response = await call
      .send({
        query:
          'query($id:ID!,$page:Int!,$size:Int!){newsComments(articleId:$id,page:$page,pageSize:$size){total page pageSize totalPages items{id body documentJson isDeleted children{id body documentJson isDeleted children{id}}}}}',
        variables: { id, page, size: pageSize },
      })
      .expect(200);
    const body = response.body as {
      errors?: unknown;
      data?: { newsComments: Page };
    };
    expect(body.errors).toBeUndefined();
    if (!body.data) throw new Error('Expected intact comment page');
    return body.data.newsComments;
  }
  async function evidence(id: string) {
    return {
      record: await fixture.prisma.comment.findUniqueOrThrow({ where: { id } }),
      revisions: await fixture.prisma.commentRevision.findMany({
        where: { commentId: id },
        orderBy: { version: 'asc' },
      }),
      audit: await fixture.prisma.auditRecord.findMany({
        where: { targetId: id },
        orderBy: { id: 'asc' },
      }),
    };
  }
  it.each(['guest', 'member'] as const)(
    'returns null tombstones and live descendants for %s without damaging the page',
    async (lane) => {
      const data = await seed();
      const before = await evidence(data.parent.id);
      const token = lane === 'member' ? member.tokens.accessToken : undefined;
      const page = await read(data.post.id, token);
      expect(page).toMatchObject({
        total: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
      expect(page.items.map((item) => item.id)).toEqual(data.expected);
      expect(
        page.items.find((item) => item.id === data.parent.id),
      ).toMatchObject({
        body: null,
        documentJson: null,
        isDeleted: true,
        children: [
          { id: data.reply.id, body: 'Synthetic live reply', isDeleted: false },
        ],
      });
      expect(page.items.find((item) => item.id === data.sibling.id)?.body).toBe(
        'Synthetic live sibling',
      );
      expect(JSON.stringify(page)).not.toContain(data.marker);
      const pages = await Promise.all([
        read(data.post.id, token, 1, 1),
        read(data.post.id, token, 2, 1),
      ]);
      expect(
        pages.flatMap((result) => result.items.map((item) => item.id)),
      ).toEqual(data.expected);
      for (const result of pages)
        expect(result).toMatchObject({ total: 2, totalPages: 2, pageSize: 1 });
      expect(await evidence(data.parent.id)).toEqual(before);
      expect(
        before.revisions.some((revision) => revision.body === data.marker),
      ).toBe(true);
      expect(before.record).toMatchObject({
        deletedById: author.user.id,
        deleteReason: 'Synthetic deletion reason',
      });
    },
  );
  it('keeps MEMBERS audience enforcement for guest/member projections', async () => {
    const data = await seed('MEMBERS');
    expect(await read(data.post.id)).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
    expect(
      (await read(data.post.id, member.tokens.accessToken)).items.find(
        (item) => item.id === data.parent.id,
      ),
    ).toMatchObject({ body: null, documentJson: null, isDeleted: true });
  });
});
