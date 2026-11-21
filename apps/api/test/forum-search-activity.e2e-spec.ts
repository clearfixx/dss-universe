/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-search-activity.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies CH-5b viewer-safe forum search and read-time Activity visibility
 * against migrated PostgreSQL.
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
import { ForumModerationService } from '@api/modules/forum/infrastructure/prisma-forum-moderation';
import { PrismaForumSearch } from '@api/modules/forum/infrastructure/prisma-forum-search';
import { PrismaForumSubjectVisibility } from '@api/modules/forum/infrastructure/prisma-forum-subject-visibility';
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Forum search and Activity visibility (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  let moderation: ForumModerationService;
  let search: PrismaForumSearch;
  let visibility: PrismaForumSubjectVisibility;
  const facts = new Map<string, Partial<ForumViewerFacts>>();
  const SECRET = 'zebraquartz';

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
      const gated = json.startsWith('GATED:');
      const text = gated ? json.slice(6) : json;
      const document = gated
        ? {
            ...createEmptyEditorDocument('FORUM_REPLY'),
            content: [{ type: 'contentGate', attrs: { gateId: randomUUID() } }],
          }
        : createEmptyEditorDocument('FORUM_REPLY');
      return {
        document,
        canonicalJson: JSON.stringify(document),
        plainText: text,
        searchText: text.toLowerCase(),
      } as ReturnType<EditorDocumentNormalizer['normalizeForumReply']>;
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
    moderation = new ForumModerationService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
      topics,
    );
    search = new PrismaForumSearch(fixture.prisma, viewers);
    visibility = new PrismaForumSubjectVisibility(fixture.prisma, viewers);
  }, 60000);

  afterAll(async () => {
    await fixture?.close();
  });

  async function user(viewer: Partial<ForumViewerFacts> = {}) {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `srch-${id}@dss.test`,
        username: `srch-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  async function forum(
    visibilityMode: 'PUBLIC' | 'RESTRICTED',
    audienceKeys: string[] = [],
    allowsGatedContent = false,
  ) {
    const admin = await user({
      seesAllCategories: true,
      canAssignModerators: true,
    });
    const category = await structure.createCategory(admin, {
      slug: 'c-' + randomUUID().slice(0, 8),
      title: 'Category',
      description: null,
      position: 0,
      visibility: visibilityMode,
      audienceKeys,
      active: true,
    });
    const created = await structure.createForum(admin, {
      categoryId: category.id,
      parentId: null,
      slug: 'f',
      title: 'Forum',
      description: null,
      position: 0,
      allowsGatedContent,
      active: true,
    });
    return { forumId: created.id, categoryId: category.id, admin };
  }

  const term = () => 'needle' + randomUUID().slice(0, 6);

  it('finds public topics by title and visible post text with excerpts', async () => {
    const { forumId } = await forum('PUBLIC');
    const word = term();
    const author = await user();
    const { topic } = await topics.createTopic(author, {
      forumId,
      kind: 'DISCUSSION',
      title: 'Ordinary title',
      documentJson: 'The body mentions ' + word + ' clearly',
    });
    const result = await search.search({ term: word, page: 1, pageSize: 10 });
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({ id: topic.id, kind: 'topic' });
    expect(result.items[0].excerpt).toContain(word);
  });

  it('never returns restricted, trashed, hidden or gated matches to unauthorized viewers', async () => {
    const word = term();
    const restricted = await forum('RESTRICTED', ['group:premium']);
    const premium = await user({ audienceKeys: ['group:premium'] });
    await topics.createTopic(premium, {
      forumId: restricted.forumId,
      kind: 'DISCUSSION',
      title: 'Restricted ' + word,
      documentJson: 'body',
    });
    const open = await forum('PUBLIC', [], true);
    const author = await user();
    const { topic: trashed } = await topics.createTopic(author, {
      forumId: open.forumId,
      kind: 'DISCUSSION',
      title: 'Trashed ' + word,
      documentJson: 'body',
    });
    const moderator = await user();
    await structure.assignModerator(open.admin, open.categoryId, moderator);
    await moderation.trashTopic(moderator, trashed.id);
    const other = await user();
    const { topic: gatedTopic } = await topics.createTopic(other, {
      forumId: open.forumId,
      kind: 'DISCUSSION',
      title: 'Plain title',
      documentJson: 'GATED:' + SECRET + ' ' + word,
    });

    const guest = await search.search({ term: word, page: 1, pageSize: 10 });
    expect(guest.total).toBe(0);
    const member = await user();
    const memberResult = await search.search({
      term: word,
      page: 1,
      pageSize: 10,
      viewerId: member,
    });
    expect(memberResult.items.map(({ id }) => id)).not.toContain(gatedTopic.id);
    const premiumResult = await search.search({
      term: word,
      page: 1,
      pageSize: 10,
      viewerId: premium,
    });
    expect(premiumResult.total).toBe(1);
    expect(JSON.stringify(premiumResult)).not.toContain(SECRET);
  });

  it('confirms Activity subjects against current visibility', async () => {
    const restricted = await forum('RESTRICTED', ['group:premium']);
    const premium = await user({ audienceKeys: ['group:premium'] });
    const { topic: secretTopic } = await topics.createTopic(premium, {
      forumId: restricted.forumId,
      kind: 'DISCUSSION',
      title: 'Secret',
      documentJson: 'body',
    });
    const open = await forum('PUBLIC');
    const author = await user();
    const { topic } = await topics.createTopic(author, {
      forumId: open.forumId,
      kind: 'DISCUSSION',
      title: 'Open',
      documentJson: 'body',
    });
    const replier = await user();
    const reply = await topics.reply(replier, {
      topicId: topic.id,
      documentJson: 'reply',
      replyToNumber: null,
      quotedNumbers: [],
    });
    const moderator = await user();
    await structure.assignModerator(open.admin, open.categoryId, moderator);
    await moderation.hidePost(moderator, reply.id, 'Not for the feed');

    const subjects = [
      { subjectType: 'ForumTopic' as const, subjectId: secretTopic.id },
      { subjectType: 'ForumTopic' as const, subjectId: topic.id },
      { subjectType: 'ForumPost' as const, subjectId: reply.id },
      { subjectType: 'ForumTopic' as const, subjectId: randomUUID() },
    ];
    const member = await user();
    await expect(visibility.visibleSubjects(member, subjects)).resolves.toEqual(
      new Set(['ForumTopic:' + topic.id]),
    );
    await expect(
      visibility.visibleSubjects(premium, subjects),
    ).resolves.toEqual(
      new Set(['ForumTopic:' + topic.id, 'ForumTopic:' + secretTopic.id]),
    );
    await moderation.trashTopic(moderator, topic.id);
    await expect(visibility.visibleSubjects(member, subjects)).resolves.toEqual(
      new Set(),
    );
  });
});
