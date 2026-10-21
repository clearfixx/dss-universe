/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Security E2E
 * 📄 File: apps/api/test/news-viewer-redaction.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies viewer-safe Full News through real root bindings and current access policy.
 *
 * 🧠 Responsibilities:
 * • tests guest, GROUP, Premium, author and membership lifecycle through GraphQL;
 * • proves provider failures cannot return authored protected JSON;
 * • distinguishes adjacent-channel evidence from Full News security acceptance.
 *
 * 🏗️ Architecture:
 * Actual AppModule and all migrations in an owned disposable schema.
 *
 * ⚠️ Important:
 * Synthetic content only; no policy provider is mocked into successful authorization.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { createEmptyEditorDocument, type EditorNode } from '@dss/editor';
import { PrismaService } from '@api/core/database';
import { Permission } from '@api/core/authorization';
import {
  CONTENT_GATE_DECISIONS,
  type ContentGateDecisions,
} from '@api/modules/content-access';
import {
  EDITOR_VIEWER_DOCUMENT_PROJECTOR,
  type EditorViewerDocumentProjector,
} from '@api/modules/editor';
import {
  NEWS_ATTACHMENT_READER,
  type NewsAttachmentReader,
} from '@api/modules/news';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { NewsSearchBackfillService } from '../src/modules/news/application/services/news-search-backfill.service';
import { NewsDeliveryService } from '../src/modules/news/application/services/news-delivery.service';
import { NewsLinksService } from '../src/modules/news/application/services/news-links.service';
import { CommentsService } from '../src/modules/interactions/application/services/comments.service';
import { ContentGatesService } from '../src/modules/content-access/application/services/content-gates.service';
import { AccessGroupsService } from '../src/modules/iam/access-groups/application/access-groups.service';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Full News server-side viewer redaction (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let author: Awaited<ReturnType<typeof register>>;
  let groups: AccessGroupsService;
  let premiumId: string;
  const refreshes: Promise<void>[] = [];
  const secret = 'DSS-SYNTHETIC-REDACTION-SECRET';
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
    author = await register();
    const permission = await prisma.permission.create({
      data: { key: 'permissions.manage', label: 'Synthetic group management' },
    });
    await prisma.userPermission.create({
      data: { userId: author.user.id, permissionId: permission.id },
    });
    groups = app.get(AccessGroupsService);
    premiumId = (
      await prisma.accessGroup.findUniqueOrThrow({ where: { key: 'premium' } })
    ).id;
  }, 60000);
  beforeEach(() => {
    const presence = app.get(UserPresenceService);
    const touch = presence.touch.bind(presence) as UserPresenceService['touch'];
    const anonymous = presence.touchAnonymous.bind(
      presence,
    ) as UserPresenceService['touchAnonymous'];
    jest.spyOn(presence, 'touch').mockImplementation((...args) => {
      const pending = touch(...args);
      refreshes.push(pending);
      return pending;
    });
    jest.spyOn(presence, 'touchAnonymous').mockImplementation((...args) => {
      const pending = anonymous(...args);
      refreshes.push(pending);
      return pending;
    });
  });
  afterEach(async () => {
    try {
      await Promise.all(refreshes.splice(0));
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
      email: 'redaction-' + id + '@dss.test',
      username: 'redaction-' + id,
      displayName: 'Redaction Pilot',
      password: 'synthetic-redaction-password-123',
    });
  }
  async function grant(groupId: string, subjectId: string, expired = false) {
    const now = Date.now();
    return groups.grant(author.user.id, {
      groupId,
      subjectId,
      validFrom: new Date(now - 60000),
      validUntil: expired ? new Date(now - 30000) : null,
    });
  }
  async function restricted(groupKey?: string, threshold = 100) {
    const gate = await app.get(ContentGatesService).create({
      ownerId: author.user.id,
      operator: 'ALL',
      requirements: [
        ...(groupKey
          ? [
              {
                kind: 'GROUP' as const,
                groupKey: 'group:' + groupKey,
                threshold: null,
              },
            ]
          : []),
        { kind: 'COMMENTS', threshold, groupKey: null },
      ],
    });
    const node: EditorNode = {
      type: 'contentGate',
      attrs: { gateId: gate.id },
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: secret }] },
      ],
    };
    return { gate, post: await article([node, node]) };
  }
  async function article(
    nodes: EditorNode[],
    visibility: 'PUBLIC' | 'MEMBERS' = 'PUBLIC',
    title = 'Synthetic redaction article',
  ) {
    const document = createEmptyEditorDocument('NEWS');
    document.content.content = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Public synthetic body.' }],
      },
      ...nodes,
    ];
    const draft = await app.get(NewsService).createDraft({
      authorId: author.user.id,
      postType: 'STANDARD',
      visibility,
      language: 'uk',
      slug: 'redaction-' + randomUUID(),
      title,
      shortText: 'Public synthetic summary.',
      documentJson: JSON.stringify(document),
      coverMediaId: null,
    });
    await prisma.newsArticle.update({
      where: { id: draft.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        displayPublishedAt: new Date(),
      },
    });
    return draft;
  }
  async function full(slug: string, token?: string) {
    const call = request(app.getHttpServer()).post('/api/graphql');
    if (token) call.set('Authorization', 'Bearer ' + token);
    const response = await call
      .send({
        query:
          'query($slug:String!){fullNews(language:"uk",slug:$slug){id documentJson templateDataJson shortText attachments{mediaId label} related{slug title shortText}}}',
        variables: { slug },
      })
      .expect(200);
    return response.body as {
      errors?: { message: string }[];
      data: {
        fullNews: {
          id: string;
          documentJson: string;
          templateDataJson: string;
          shortText: string;
          attachments: { mediaId: string; label: string }[];
        } | null;
      };
    };
  }
  async function expectProtected(
    slug: string,
    token: string | undefined,
    allowed: boolean,
  ) {
    const response = await full(slug, token);
    expect(response.errors).toBeUndefined();
    expect(response.data.fullNews?.documentJson.includes(secret)).toBe(allowed);
    expect(response.data.fullNews?.documentJson).toContain(
      'Public synthetic body.',
    );
    if (!allowed) expect(JSON.stringify(response)).not.toContain(secret);
    return response;
  }
  it('redacts guests and deduplicates repeated gate decisions without altering stored content', async () => {
    const { gate, post } = await restricted();
    const decisions = jest.spyOn(
      app.get<ContentGateDecisions>(CONTENT_GATE_DECISIONS),
      'evaluate',
    );
    await expectProtected(post.slug, undefined, false);
    expect(decisions.mock.calls).toEqual([[gate.id, null]]);
    expect(
      JSON.stringify(
        (await prisma.newsArticle.findUniqueOrThrow({ where: { id: post.id } }))
          .document,
      ),
    ).toContain(secret);
  });
  it.each([0, 100])(
    'applies current numeric policy to an ordinary member at threshold %s',
    async (threshold) => {
      const viewer = await register();
      const { post } = await restricted(undefined, threshold);
      await expectProtected(
        post.slug,
        viewer.tokens.accessToken,
        threshold === 0,
      );
    },
  );
  it('preserves author numeric bypass without reusing it for the next guest', async () => {
    const { post } = await restricted();
    await expectProtected(post.slug, author.tokens.accessToken, true);
    await expectProtected(post.slug, undefined, false);
  });
  it('does not bypass mandatory GROUP for Premium or author', async () => {
    const group = await groups.create(author.user.id, {
      key: 'g-' + randomUUID(),
      displayName: 'Synthetic audience',
      capabilities: [],
    });
    const viewer = await register();
    await grant(premiumId, viewer.user.id);
    const { post } = await restricted(group.key);
    await expectProtected(post.slug, viewer.tokens.accessToken, false);
    await expectProtected(post.slug, author.tokens.accessToken, false);
    const authorMembership = await grant(group.id, author.user.id);
    await expectProtected(post.slug, author.tokens.accessToken, true);
    await groups.revoke(
      author.user.id,
      authorMembership.id,
      'Synthetic author audience revocation',
    );
    await expectProtected(post.slug, author.tokens.accessToken, false);
  });
  it('retains numeric thresholds for a matching ordinary group member', async () => {
    const group = await groups.create(author.user.id, {
      key: 'g-' + randomUUID(),
      displayName: 'Synthetic audience',
      capabilities: [],
    });
    const viewer = await register();
    await grant(group.id, viewer.user.id);
    const { post } = await restricted(group.key);
    await expectProtected(post.slug, viewer.tokens.accessToken, false);
  });
  it('Premium bypasses numbers only in its allowed audience and revocation is live with the same JWT', async () => {
    const group = await groups.create(author.user.id, {
      key: 'g-' + randomUUID(),
      displayName: 'Synthetic audience',
      capabilities: [],
    });
    const viewer = await register();
    const membership = await grant(group.id, viewer.user.id);
    const premium = await grant(premiumId, viewer.user.id);
    const { post } = await restricted(group.key);
    await expectProtected(post.slug, viewer.tokens.accessToken, true);
    await groups.revoke(
      author.user.id,
      premium.id,
      'Synthetic Premium revocation',
    );
    await expectProtected(post.slug, viewer.tokens.accessToken, false);
    await grant(premiumId, viewer.user.id);
    await groups.revoke(
      author.user.id,
      membership.id,
      'Synthetic audience revocation',
    );
    await expectProtected(post.slug, viewer.tokens.accessToken, false);
  });
  it.each(['group', 'premium'] as const)(
    'ignores expired %s membership',
    async (kind) => {
      const group = await groups.create(author.user.id, {
        key: 'g-' + randomUUID(),
        displayName: 'Synthetic audience',
        capabilities: [],
      });
      const viewer = await register();
      await grant(group.id, viewer.user.id, kind === 'group');
      await grant(premiumId, viewer.user.id, kind === 'premium');
      const { post } = await restricted(group.key);
      await expectProtected(post.slug, viewer.tokens.accessToken, false);
    },
  );
  it.each(['editor', 'decision'] as const)(
    'fails closed for %s provider errors without reading attachment metadata',
    async (provider) => {
      const { post } = await restricted();
      const metadata = jest.spyOn(
        app.get<NewsAttachmentReader>(NEWS_ATTACHMENT_READER),
        'read',
      );
      if (provider === 'editor')
        jest
          .spyOn(
            app.get<EditorViewerDocumentProjector>(
              EDITOR_VIEWER_DOCUMENT_PROJECTOR,
            ),
            'project',
          )
          .mockRejectedValue(new Error('Synthetic projection failure'));
      else
        jest
          .spyOn(
            app.get<ContentGateDecisions>(CONTENT_GATE_DECISIONS),
            'evaluate',
          )
          .mockRejectedValue(new Error('Synthetic decision failure'));
      await expect(
        app.get(NewsDeliveryService).fullBySlug('uk', post.slug),
      ).rejects.toThrow('Synthetic');
      const response = await full(post.slug);
      expect(response.errors?.length).toBeGreaterThan(0);
      expect(response.data.fullNews).toBeNull();
      expect(JSON.stringify(response)).not.toContain(secret);
      expect(metadata).not.toHaveBeenCalled();
    },
  );
  it('short-circuits missing and audience-ineligible articles before projection', async () => {
    const post = await article([], 'MEMBERS');
    const projection = jest.spyOn(
      app.get<EditorViewerDocumentProjector>(EDITOR_VIEWER_DOCUMENT_PROJECTOR),
      'project',
    );
    expect((await full('missing-' + randomUUID())).data.fullNews).toBeNull();
    expect((await full(post.slug)).data.fullNews).toBeNull();
    expect(projection).not.toHaveBeenCalled();
  });
  it('fails closed for malformed stored legacy document nodes rather than falling back to raw JSON', async () => {
    const { post } = await restricted();
    await prisma.newsArticle.update({
      where: { id: post.id },
      data: {
        document: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: secret }] },
          ],
        },
      },
    });
    try {
      const response = await full(post.slug);
      expect(response.errors?.length).toBeGreaterThan(0);
      expect(response.data.fullNews).toBeNull();
      expect(JSON.stringify(response)).not.toContain(secret);
    } finally {
      // Restore only this deliberately corrupted synthetic fixture for later search readiness.
      await prisma.newsArticle.update({
        where: { id: post.id },
        data: { document: post.document as unknown as Prisma.InputJsonValue },
      });
      await app.get(NewsSearchBackfillService).run();
    }
  });
  it('retains an ordinary canonical document and public summary/template response shape', async () => {
    const post = await article([]);
    const response = await full(post.slug);
    expect(response.errors).toBeUndefined();
    expect(response.data.fullNews).toMatchObject({
      id: post.id,
      shortText: 'Public synthetic summary.',
      templateDataJson: '{}',
      attachments: [],
    });
    expect(response.data.fullNews?.documentJson).toBe(
      JSON.stringify(post.document),
    );
  });
  it('recursively removes a denied inner gate inside an allowed outer gate', async () => {
    const viewer = await register();
    const outer = await app.get(ContentGatesService).create({
      ownerId: author.user.id,
      operator: 'ALL',
      requirements: [{ kind: 'COMMENTS', threshold: 0, groupKey: null }],
    });
    const inner = await app.get(ContentGatesService).create({
      ownerId: author.user.id,
      operator: 'ALL',
      requirements: [{ kind: 'COMMENTS', threshold: 100, groupKey: null }],
    });
    const post = await article([
      {
        type: 'contentGate',
        attrs: { gateId: outer.id },
        content: [
          {
            type: 'contentGate',
            attrs: { gateId: inner.id },
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: secret }] },
            ],
          },
        ],
      },
    ]);
    const response = await expectProtected(
      post.slug,
      viewer.tokens.accessToken,
      false,
    );
    expect(response.data.fullNews?.documentJson).toContain(outer.id);
    expect(response.data.fullNews?.documentJson).toContain(inner.id);
  });
  it('redacts protected attachment labels and IDs before any metadata projection', async () => {
    const id = randomUUID();
    const asset = await prisma.media.create({
      data: {
        id,
        ownerId: author.user.id,
        status: 'READY',
        visibility: 'PUBLIC',
        kind: 'DOCUMENT',
        storageProvider: 'LOCAL',
        bucket: 'synthetic',
        storageKey: id,
        originalFilename: 'synthetic.pdf',
        mimeType: 'application/pdf',
        extension: 'pdf',
        size: 12,
        checksum: id,
      },
    });
    const gate = await app.get(ContentGatesService).create({
      ownerId: author.user.id,
      operator: 'ALL',
      requirements: [{ kind: 'COMMENTS', threshold: 100, groupKey: null }],
    });
    const post = await article([
      {
        type: 'contentGate',
        attrs: { gateId: gate.id },
        content: [
          { type: 'attachment', attrs: { mediaId: asset.id, label: secret } },
        ],
      },
    ]);
    const metadata = jest.spyOn(
      app.get<NewsAttachmentReader>(NEWS_ATTACHMENT_READER),
      'read',
    );
    const response = await expectProtected(post.slug, undefined, false);
    expect(JSON.stringify(response)).not.toContain(asset.id);
    expect(metadata).not.toHaveBeenCalled();
  });
  it.each(['COMMENT', 'NEWS'] as const)(
    'rejects protected %s documents on the supported comment write path before persistence',
    async (profile) => {
      const { gate, post } = await restricted();
      const comments = app.get(CommentsService);
      const targetId = post.interactionTargetId;
      const document = createEmptyEditorDocument(profile);
      document.content.content = [
        {
          type: 'contentGate',
          attrs: { gateId: gate.id },
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: secret }] },
          ],
        },
      ];
      await expect(
        comments.create(author.user.id, targetId, {
          documentJson: JSON.stringify(document),
        }),
      ).rejects.toThrow('Editor document');
      expect(
        await prisma.comment.count({
          where: { interactionTargetId: targetId },
        }),
      ).toBe(0);
      const ordinary = await comments.create(author.user.id, targetId, {
        body: 'Public synthetic comment.',
      });
      expect(ordinary.body).toBe('Public synthetic comment.');
      const page = await app.get(NewsDeliveryService).comments(post.id);
      expect(page.items.map(({ id }) => id)).toContain(ordinary.id);
      expect(JSON.stringify(page)).not.toContain(secret);
    },
  );
  it('does not expose related metadata from a MEMBERS article denied to the guest after DEBT-054', async () => {
    const permission = await prisma.permission.create({
      data: {
        key: Permission.NewsLinksManage,
        label: 'Synthetic link management',
      },
    });
    await prisma.userPermission.create({
      data: { userId: author.user.id, permissionId: permission.id },
    });
    const source = await article([]);
    const hidden = await article(
      [],
      'MEMBERS',
      'DSS-SYNTHETIC-MEMBERS-ONLY-HEADLINE',
    );
    await app.get(NewsLinksService).create(author.user.id, {
      sourceArticleId: source.id,
      targetArticleId: hidden.id,
      type: 'RELATED',
      anchorText: 'Synthetic member article',
    });
    expect((await full(hidden.slug)).data.fullNews).toBeNull();
    const response = await full(source.slug);
    expect(response.errors).toBeUndefined();
    expect(JSON.stringify(response)).not.toContain(hidden.title);
    expect(JSON.stringify(response)).not.toContain(hidden.slug);
  });
  it('does not disclose hidden-only matches through guest News search after DEBT-053', async () => {
    const { post } = await restricted();
    await expectProtected(post.slug, undefined, false);
    async function search(text: string) {
      const response = await request(app.getHttpServer())
        .post('/api/graphql')
        .send({
          query:
            'query($search:String!){news(input:{search:$search,pageSize:100}){total items{id shortText}}}',
          variables: { search: text },
        })
        .expect(200);
      return response.body as {
        errors?: { message: string }[];
        data: {
          news: { total: number; items: { id: string; shortText: string }[] };
        };
      };
    }
    const matching = await search(secret);
    expect(matching.errors).toBeUndefined();
    expect(matching.data.news.items.map(({ id }) => id)).not.toContain(post.id);
    expect(matching.data.news.total).toBe(0);
    expect(JSON.stringify(matching)).not.toContain(secret);
    expect((await search('DSS-ABSENT-' + randomUUID())).data.news.total).toBe(
      0,
    );
  });
});
