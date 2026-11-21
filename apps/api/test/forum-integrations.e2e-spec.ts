/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-integrations.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies CH-5a subscriptions, News discussion links and the FORUM_POSTS
 * gate fact against migrated PostgreSQL.
 *
 * ⚠️ Important:
 * Uses an isolated schema in the disposable dss_test database only.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { createEmptyEditorDocument } from '@dss/editor';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import type { EditorDocumentNormalizer } from '@api/modules/editor';
import type { ForumViewerFacts } from '@api/modules/forum';
import { ForumIntegrationsService } from '@api/modules/forum/infrastructure/prisma-forum-integrations';
import { PrismaForumTopicCounts } from '@api/modules/forum/infrastructure/prisma-forum-topic-counts';
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Forum integrations (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  let integrations: ForumIntegrationsService;
  const facts = new Map<string, Partial<ForumViewerFacts>>();
  const articles = new Map<string, { authorId: string; published: boolean }>();

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const viewers = {
      read: (subjectId: string | null) =>
        Promise.resolve({
          subjectId,
          audienceKeys: [],
          seesAllCategories: false,
          moderatesAllCategories: false,
          canAssignModerators: false,
          canPurgeContent: false,
          ...(subjectId ? facts.get(subjectId) : {}),
        }),
    };
    const audit = new AuditWriterService(new AuditRedactionService());
    const outbox = new OutboxWriterService();
    const normalize = (json: string) => {
      const document = createEmptyEditorDocument('FORUM_REPLY');
      return {
        document,
        canonicalJson: JSON.stringify(document),
        plainText: 'Text ' + json,
        searchText: 'text',
      };
    };
    const editor = {
      normalizeForumTopic: normalize,
      normalizeForumReply: normalize,
    } as unknown as EditorDocumentNormalizer;
    structure = new ForumStructureService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
    );
    topics = new ForumTopicsService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
      editor,
      structure,
      {
        project: (documentJson) => Promise.resolve({ documentJson, gates: [] }),
      },
      { project: (documentJson) => Promise.resolve({ documentJson }) },
    );
    integrations = new ForumIntegrationsService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
      { find: (id) => Promise.resolve(articles.get(id) ?? null) },
      topics,
    );
  }, 60000);

  afterAll(async () => {
    await fixture?.close();
  });

  async function user(viewer: Partial<ForumViewerFacts> = {}) {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `int-${id}@dss.test`,
        username: `int-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  async function forum(visibility: 'PUBLIC' | 'MEMBERS' = 'PUBLIC') {
    const admin = await user({
      seesAllCategories: true,
      canAssignModerators: true,
    });
    const category = await structure.createCategory(admin, {
      slug: 'c-' + randomUUID().slice(0, 8),
      title: 'Category',
      description: null,
      position: 0,
      visibility,
      audienceKeys: [],
      active: true,
    });
    const created = await structure.createForum(admin, {
      categoryId: category.id,
      parentId: null,
      slug: 'news-talk',
      title: 'News talk',
      description: null,
      position: 0,
      allowsGatedContent: false,
      active: true,
    });
    return { forumId: created.id, categoryId: category.id, admin };
  }

  async function topic(forumId: string, author: string) {
    return (
      await topics.createTopic(author, {
        forumId,
        kind: 'DISCUSSION',
        title: '[обговорення] Release notes',
        documentJson: 'first',
      })
    ).topic;
  }

  it('records idempotent topic subscriptions per user', async () => {
    const { forumId } = await forum();
    const author = await user();
    const created = await topic(forumId, author);
    const reader = await user();
    await integrations.subscribe(reader, created.id);
    await integrations.subscribe(reader, created.id);
    await expect(integrations.isSubscribed(reader, created.id)).resolves.toBe(
      true,
    );
    await integrations.unsubscribe(reader, created.id);
    await expect(integrations.isSubscribed(reader, created.id)).resolves.toBe(
      false,
    );
    await expect(integrations.isSubscribed(null, created.id)).resolves.toBe(
      false,
    );
  });

  it('links a published article to one topic for its author or a category moderator', async () => {
    const { forumId, categoryId, admin } = await forum();
    const author = await user();
    const discussion = await topic(forumId, author);
    const articleAuthor = await user();
    const articleId = randomUUID();
    articles.set(articleId, { authorId: articleAuthor, published: true });
    const stranger = await user();
    await expect(
      integrations.linkNewsDiscussion(stranger, articleId, discussion.id),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await integrations.linkNewsDiscussion(
      articleAuthor,
      articleId,
      discussion.id,
    );
    await expect(
      integrations.newsDiscussion(null, articleId),
    ).resolves.toMatchObject({ id: discussion.id });

    const moderator = await user();
    await structure.assignModerator(admin, categoryId, moderator);
    const replacement = await topic(forumId, await user());
    await integrations.linkNewsDiscussion(moderator, articleId, replacement.id);
    await expect(
      integrations.newsDiscussion(null, articleId),
    ).resolves.toMatchObject({ id: replacement.id });

    const otherArticle = randomUUID();
    articles.set(otherArticle, { authorId: articleAuthor, published: true });
    await expect(
      integrations.linkNewsDiscussion(
        articleAuthor,
        otherArticle,
        replacement.id,
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    const draft = randomUUID();
    articles.set(draft, { authorId: articleAuthor, published: false });
    await expect(
      integrations.linkNewsDiscussion(articleAuthor, draft, discussion.id),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    await integrations.unlinkNewsDiscussion(moderator, articleId);
    await expect(
      integrations.newsDiscussion(null, articleId),
    ).resolves.toBeNull();
    await expect(
      fixture.prisma.outboxEvent.count({
        where: { eventName: { startsWith: 'forum.news_discussion.' } },
      }),
    ).resolves.toBe(3);
  });

  it('hides the discussion link from viewers who cannot see the topic', async () => {
    const { forumId } = await forum('MEMBERS');
    const author = await user();
    const discussion = await topic(forumId, author);
    const articleId = randomUUID();
    articles.set(articleId, { authorId: author, published: true });
    await integrations.linkNewsDiscussion(author, articleId, discussion.id);
    await expect(
      integrations.newsDiscussion(null, articleId),
    ).resolves.toBeNull();
    await expect(
      integrations.newsDiscussion(author, articleId),
    ).resolves.toMatchObject({ id: discussion.id });
  });

  it('counts only topics in public forums for the FORUM_POSTS gate fact', async () => {
    const publicForum = await forum('PUBLIC');
    const membersForum = await forum('MEMBERS');
    const author = await user();
    await topic(publicForum.forumId, author);
    await fixture.prisma.forumPostingCooldown.updateMany({
      where: { userId: author },
      data: { lastPostAt: new Date(Date.now() - 61_000) },
    });
    await topic(membersForum.forumId, author);
    await expect(
      new PrismaForumTopicCounts(fixture.prisma).countPublicTopicsByAuthor(
        author,
      ),
    ).resolves.toBe(1);
  });
});
