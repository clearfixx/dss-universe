/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/test/forum-viewer-abilities.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies CH-5f ForumTopic.viewerAbilities against migrated PostgreSQL:
 * the UI hints must match the rules the commands enforce.
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
import { PrismaForumReadModels } from '@api/modules/forum/infrastructure/prisma-forum-read-models';
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import {
  ForumPostReadResolver,
  ForumTopicReadResolver,
} from '@api/modules/forum/presentation/forum-read-models.resolver';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Forum topic viewer abilities (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  let resolver: ForumTopicReadResolver;
  let postResolver: ForumPostReadResolver;
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
      {
        project: (documentJson) => Promise.resolve({ documentJson, gates: [] }),
      },
      { project: (documentJson) => Promise.resolve({ documentJson }) },
    );
    resolver = new ForumTopicReadResolver(
      { cards: () => Promise.resolve([]) },
      new PrismaForumReadModels(fixture.prisma),
      viewers,
    );
    postResolver = new ForumPostReadResolver(
      { cards: () => Promise.resolve([]) },
      new PrismaForumReadModels(fixture.prisma),
      viewers,
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
        email: `abl-${id}@dss.test`,
        username: `abl-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  const abilities = (topic: object, viewerId: string | null) =>
    resolver.viewerAbilities(topic as never, {
      req: viewerId ? { user: { id: viewerId } as never } : {},
    });

  it('matches the command rules for guests, members, authors and staff', async () => {
    const admin = await user({
      seesAllCategories: true,
      canAssignModerators: true,
      canPurgeContent: true,
      canViewNetwork: true,
      canDeleteNetwork: true,
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
      slug: 'f',
      title: 'Forum',
      description: null,
      position: 0,
      allowsGatedContent: false,
      active: true,
    });
    const moderator = await user();
    await structure.assignModerator(admin, category.id, moderator);
    const otherCategoryModerator = await user();
    const author = await user();
    const member = await user();
    const { topic } = await topics.createTopic(author, {
      forumId: forum.id,
      kind: 'QUESTION',
      title: 'Question',
      documentJson: 'q',
    });

    await expect(abilities(topic, null)).resolves.toEqual({
      moderate: false,
      purge: false,
      network: false,
      networkDelete: false,
      acceptAnswer: false,
      close: false,
      reopen: false,
      reply: false,
      staffRole: null,
    });
    await expect(abilities(topic, member)).resolves.toEqual({
      moderate: false,
      purge: false,
      network: false,
      networkDelete: false,
      acceptAnswer: false,
      close: false,
      reopen: false,
      reply: true,
      staffRole: null,
    });
    await expect(abilities(topic, author)).resolves.toMatchObject({
      moderate: false,
      acceptAnswer: true,
      close: true,
      reopen: false,
    });
    await expect(abilities(topic, moderator)).resolves.toMatchObject({
      moderate: true,
      purge: false,
      acceptAnswer: true,
      close: true,
      staffRole: 'MODERATOR',
    });
    await expect(
      abilities(topic, otherCategoryModerator),
    ).resolves.toMatchObject({ moderate: false });
    await expect(abilities(topic, admin)).resolves.toMatchObject({
      moderate: true,
      purge: true,
      network: true,
      networkDelete: true,
      staffRole: 'ADMINISTRATOR',
    });

    // One request, a post field first (as in the topic page query): every
    // resolver shares the request loaders, so none may build them blind.
    const shared = { req: { user: { id: admin } as never } };
    await postResolver.author({ authorId: author } as never, shared);
    await expect(
      resolver.viewerAbilities(topic as never, shared),
    ).resolves.toMatchObject({ moderate: true, staffRole: 'ADMINISTRATOR' });

    const closed = { ...topic, state: 'CLOSED', acceptedAnswerPostId: 'x' };
    await expect(abilities(closed, author)).resolves.toMatchObject({
      acceptAnswer: false,
      close: false,
      reopen: false,
      reply: false,
    });
    await expect(abilities(closed, moderator)).resolves.toMatchObject({
      acceptAnswer: true,
      reopen: true,
    });
  });
});
