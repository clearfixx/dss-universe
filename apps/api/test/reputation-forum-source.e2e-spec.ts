/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: API E2E Tests
 * 📄 File: apps/api/test/reputation-forum-source.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Reputation changed from a forum post (owner 2026-11-26): the post author
 * is the recipient, one change per member per post, and the public history
 * names the post and reports when it was deleted.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/core/database';

type RegisteredUser = { id: string; accessToken: string };
type GqlBody = {
  data?: Record<string, unknown> | null;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
};

const doc = (profile: string) =>
  JSON.stringify({
    schemaVersion: 1,
    profile,
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Body text' }] },
      ],
    },
  });

describe('Reputation from forum posts (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.reputationPolicy.upsert({
      where: { id: 'default' },
      update: { minimumAccountAgeDays: 0 },
      create: { id: 'default', minimumAccountAgeDays: 0 },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('credits the post author once per post and explains it in the history', async () => {
    const author = await register('rep-src-author');
    const actor = await register('rep-src-actor');
    const bystander = await register('rep-src-other');
    const { postId } = await forumPost(author);

    const give = (
      user: RegisteredUser,
      input: Record<string, unknown>,
    ): Promise<GqlBody> =>
      gql(
        user,
        `mutation Give($input: GiveReputationInput!) {
          giveReputation(input: $input) {
            id value recipientId source { type id deleted }
          }
        }`,
        { input },
      );

    const first = await give(actor, {
      recipientId: author.id,
      value: 1,
      reason: 'Very helpful explanation.',
      source: { type: 'FORUM_POST', id: postId },
    });
    expect(first.errors).toBeUndefined();
    expect(first.data).toMatchObject({
      giveReputation: {
        value: 1,
        recipientId: author.id,
        source: { type: 'FORUM_POST', id: postId, deleted: false },
      },
    });

    // Once per post, even with the opposite sign.
    const again = await give(actor, {
      recipientId: author.id,
      value: -1,
      reason: 'Changed my mind about it.',
      source: { type: 'FORUM_POST', id: postId },
    });
    expect(again.errors?.[0]?.extensions?.code).toBe('CONFLICT');

    // The recipient must be the post author.
    const wrong = await give(actor, {
      recipientId: bystander.id,
      value: 1,
      reason: 'Not the author of the post.',
      source: { type: 'FORUM_POST', id: postId },
    });
    expect(wrong.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');

    // Unknown post.
    const missing = await give(actor, {
      recipientId: author.id,
      value: 1,
      reason: 'Post that does not exist.',
      source: {
        type: 'FORUM_POST',
        id: '00000000-0000-4000-8000-000000000000',
      },
    });
    expect(missing.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');

    // A second post of the same author is a new source.
    const { postId: secondPost } = await forumPost(author);
    const second = await give(actor, {
      recipientId: author.id,
      value: -1,
      reason: 'This one was wrong.',
      source: { type: 'FORUM_POST', id: secondPost },
    });
    expect(second.errors).toBeUndefined();

    const history = async () =>
      gql(
        bystander,
        `query History($userId: ID!) {
          reputationHistory(userId: $userId) {
            score
            viewerCanReverse
            items { reason actor { username } source { type id deleted } }
          }
        }`,
        { userId: author.id },
      );
    const before = await history();
    expect(before.errors).toBeUndefined();
    expect(before.data).toMatchObject({
      reputationHistory: {
        score: 0,
        viewerCanReverse: false,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- jest matcher
        items: expect.arrayContaining([
          expect.objectContaining({
            reason: 'Very helpful explanation.',
            source: { type: 'FORUM_POST', id: postId, deleted: false },
          }),
        ]),
      },
    });

    await prisma.forumPost.update({
      where: { id: postId },
      data: {
        state: 'DELETED',
        moderatedAt: new Date(),
        moderatedById: author.id,
        moderationReason: 'Deleted in test',
      },
    });
    const after = await history();
    const items = (
      after.data as {
        reputationHistory: {
          items: Array<{ source: { id: string; deleted: boolean } | null }>;
        };
      }
    ).reputationHistory.items;
    expect(items.find((item) => item.source?.id === postId)?.source).toEqual(
      expect.objectContaining({ deleted: true }),
    );
    expect(
      items.find((item) => item.source?.id === secondPost)?.source?.deleted,
    ).toBe(false);
  });

  async function gql(
    user: RegisteredUser | null,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<GqlBody> {
    const call = request(app.getHttpServer()).post('/api/graphql');
    if (user) call.set('Authorization', `Bearer ${user.accessToken}`);
    const response = await call.send({ query, variables }).expect(200);
    return response.body as GqlBody;
  }

  async function forumPost(author: RegisteredUser) {
    const slug = `rep-src-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const category = await prisma.forumCategory.create({
      data: { slug, title: 'Reputation source', visibility: 'PUBLIC' },
    });
    const forum = await prisma.forum.create({
      data: { categoryId: category.id, slug, title: 'Section' },
    });
    await prisma.forumPostingCooldown.deleteMany({
      where: { userId: author.id },
    });
    const created = await gql(
      author,
      `mutation Create($input: CreateForumTopicInput!) {
        createForumTopic(input: $input) { firstPostId }
      }`,
      {
        input: {
          forumId: forum.id,
          title: 'Reputation source topic',
          documentJson: doc('FORUM_TOPIC'),
        },
      },
    );
    expect(created.errors).toBeUndefined();
    return {
      postId: (created.data as { createForumTopic: { firstPostId: string } })
        .createForumTopic.firstPostId,
    };
  }

  async function register(prefix: string): Promise<RegisteredUser> {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const username = `${prefix}-${suffix}`;
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation Register($input: RegisterInput!) {
          register(input: $input) { user { id } tokens { accessToken } }
        }`,
        variables: {
          input: {
            email: `${username}@dss.test`,
            username,
            displayName: prefix,
            password: 'dss-test-password',
          },
        },
      })
      .expect(200);
    const result = response.body as {
      data: {
        register: { user: { id: string }; tokens: { accessToken: string } };
      };
    };
    return {
      id: result.data.register.user.id,
      accessToken: result.data.register.tokens.accessToken,
    };
  }
});
