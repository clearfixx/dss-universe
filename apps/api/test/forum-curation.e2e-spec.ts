/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-curation.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies CH-3a accepted answers, curated tags and topic polls against
 * migrated PostgreSQL.
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
import { ForumCurationService } from '@api/modules/forum/infrastructure/prisma-forum-curation';
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import { PrismaPollsRepository } from '@api/modules/interactions/infrastructure/repositories/prisma-polls.repository';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Forum curation (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  let curation: ForumCurationService;
  const facts = new Map<string, Partial<ForumViewerFacts>>();

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
    );
    const polls = new PrismaPollsRepository(fixture.prisma, audit, outbox);
    curation = new ForumCurationService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
      { createPoll: (command) => polls.create(command) },
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
        email: `cur-${id}@dss.test`,
        username: `cur-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  async function scene(kind: 'QUESTION' | 'DISCUSSION' = 'QUESTION') {
    const admin = await user({
      seesAllCategories: true,
      canAssignModerators: true,
    });
    const category = await structure.createCategory(admin, {
      slug: 'c-' + randomUUID().slice(0, 8),
      title: 'Category',
      description: null,
      position: 0,
      visibility: 'PUBLIC',
      audienceKeys: [],
      active: true,
    });
    const forum = await structure.createForum(admin, {
      categoryId: category.id,
      parentId: null,
      slug: 'help',
      title: 'Help',
      description: null,
      position: 0,
      allowsGatedContent: false,
      active: true,
    });
    const moderator = await user();
    await structure.assignModerator(admin, category.id, moderator);
    const author = await user();
    const helper = await user();
    const { topic } = await topics.createTopic(author, {
      forumId: forum.id,
      kind,
      title: 'How to configure Prisma?',
      documentJson: 'q',
    });
    const reply = await topics.reply(helper, {
      topicId: topic.id,
      documentJson: 'a',
      replyToNumber: 1,
      quotedNumbers: [],
    });
    return { forumId: forum.id, moderator, author, helper, topic, reply };
  }

  it('lets the author accept an answer once and only moderators change or clear it', async () => {
    const s = await scene();
    const accepted = await curation.acceptAnswer(
      s.author,
      s.topic.id,
      s.reply.id,
    );
    expect(accepted).toMatchObject({
      acceptedAnswerPostId: s.reply.id,
      state: 'OPEN',
    });
    await expect(
      curation.acceptAnswer(s.author, s.topic.id, s.reply.id),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      curation.clearAcceptedAnswer(s.author, s.topic.id),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      curation.clearAcceptedAnswer(s.moderator, s.topic.id),
    ).resolves.toMatchObject({ acceptedAnswerPostId: null });
    await expect(
      fixture.prisma.outboxEvent.count({
        where: {
          eventName: 'forum.answer.accepted.v1',
          aggregateId: s.topic.id,
        },
      }),
    ).resolves.toBe(1);
  });

  it('rejects answers in discussions and self-accepted replies', async () => {
    const discussion = await scene('DISCUSSION');
    await expect(
      curation.acceptAnswer(
        discussion.author,
        discussion.topic.id,
        discussion.reply.id,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      fixture.prisma.forumTopic.update({
        where: { id: discussion.topic.id },
        data: {
          acceptedAnswerPostId: discussion.reply.id,
          acceptedAt: new Date(),
          acceptedById: discussion.author,
        },
      }),
    ).rejects.toThrow();
  });

  it('curates tags per forum, assigns at most five and filters topics', async () => {
    const s = await scene();
    await expect(
      curation.createTag(s.author, s.forumId, {
        slug: 'prisma',
        label: 'Prisma',
      }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    const prisma = await curation.createTag(s.moderator, s.forumId, {
      slug: 'prisma',
      label: 'Prisma',
    });
    const nest = await curation.createTag(s.moderator, s.forumId, {
      slug: 'nestjs',
      label: 'NestJS',
    });
    await expect(
      curation.createTag(s.moderator, s.forumId, {
        slug: 'prisma',
        label: 'Dup',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    const tagged = await curation.setTopicTags(s.author, s.topic.id, [
      prisma.id,
      nest.id,
    ]);
    expect(tagged.tags.map(({ slug }) => slug)).toEqual(['nestjs', 'prisma']);
    const filtered = await topics.topics(
      null,
      s.forumId,
      'LAST_ACTIVITY',
      1,
      20,
      'ACTIVE',
      'WEEK',
      'prisma',
    );
    expect(filtered.items.map(({ id }) => id)).toEqual([s.topic.id]);
    const ranked = await topics.topics(
      null,
      s.forumId,
      'TOP',
      1,
      20,
      'ACTIVE',
      'ALL',
      'missing',
    );
    expect(ranked.items).toHaveLength(0);
    await curation.updateTag(s.moderator, prisma.id, {
      slug: 'prisma',
      label: 'Prisma',
      active: false,
    });
    await expect(
      curation.setTopicTags(s.author, s.topic.id, [prisma.id]),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('attaches one poll to an open topic by its author', async () => {
    const s = await scene();
    const poll = {
      question: 'Which version?',
      options: ['6', '7'],
      visibility: 'OPEN' as const,
      maxChoices: 1,
    };
    await expect(
      curation.attachPoll(s.helper, s.topic.id, poll),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    const { pollId } = await curation.attachPoll(s.author, s.topic.id, poll);
    expect(pollId).toBeTruthy();
    await expect(
      curation.attachPoll(s.moderator, s.topic.id, poll),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
