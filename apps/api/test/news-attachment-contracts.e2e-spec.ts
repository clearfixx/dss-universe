/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Attachment E2E
 * 📄 File: apps/api/test/news-attachment-contracts.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies canonical attachment manifests, owner metadata eligibility and Full News redaction.
 *
 * 🧠 Responsibilities:
 * • exercises actual News/Media root bindings and all real migrations;
 * • tests canonical public delivery and legacy component compatibility separately.
 *
 * 🏗️ Architecture:
 * AppModule E2E in an owned disposable schema; no production policy is stubbed into success.
 *
 * ⚠️ Important:
 * Metadata checks do not prove binary access; no storage keys or provider internals may leak.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import type { MediaStatus, MediaVisibility } from '@prisma/client';
import { createEmptyEditorDocument, type EditorNode } from '@dss/editor';
import { PrismaService } from '@api/core/database';
import {
  MEDIA_PUBLIC_ATTACHMENT_READER,
  type MediaPublicAttachmentReader,
} from '@api/modules/media';
import {
  NEWS_ATTACHMENT_READER,
  type NewsAttachmentReader,
} from '@api/modules/news';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { NewsDeliveryService } from '../src/modules/news/application/services/news-delivery.service';
import { NewsAttachmentDeliveryService } from '../src/modules/news/application/services/news-attachment-delivery.service';
import { ContentGatesService } from '../src/modules/content-access/application/services/content-gates.service';
import { EditorContentDeliveryService } from '../src/modules/editor/application/services/editor-content-delivery.service';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('News public attachment metadata owner contracts (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let owner: Awaited<ReturnType<typeof register>>;
  let delivery: NewsDeliveryService;
  const refreshes: Promise<void>[] = [];
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
    delivery = app.get(NewsDeliveryService);
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
      email: 'attachment-' + id + '@dss.test',
      username: 'attachment-' + id,
      displayName: 'Attachment Pilot',
      password: 'attachment-contract-fixture-123',
    });
  }
  async function media(
    status: MediaStatus = 'READY',
    visibility: MediaVisibility = 'PUBLIC',
  ) {
    const id = randomUUID();
    return prisma.media.create({
      data: {
        ownerId: owner.user.id,
        status,
        visibility,
        kind: 'DOCUMENT',
        storageProvider: 'LOCAL',
        bucket: 'synthetic-private-bucket',
        storageKey: id,
        originalFilename: 'manual.pdf',
        mimeType: 'application/pdf',
        extension: 'pdf',
        size: 123,
        checksum: id,
        checksumSha1: 'synthetic-sha1',
        checksumMd5: 'synthetic-md5',
        metadata: { private: 'not-for-readers' },
      },
    });
  }
  const attachment = (mediaId: string, label: string): EditorNode => ({
    type: 'attachment',
    attrs: { mediaId, label },
  });
  async function article(
    nodes: EditorNode[],
    options: { legacyNode?: boolean; visibility?: 'PUBLIC' | 'MEMBERS' } = {},
  ) {
    const document = createEmptyEditorDocument('NEWS');
    document.content.content = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Published fixture.' }],
      },
      ...nodes,
    ];
    const draft = await app.get(NewsService).createDraft({
      authorId: owner.user.id,
      postType: 'STANDARD',
      visibility: options.visibility ?? 'PUBLIC',
      language: 'uk',
      slug: 'attachment-' + randomUUID(),
      title: 'Attachment boundary',
      shortText: 'Published attachment metadata fixture.',
      documentJson: JSON.stringify(document),
      coverMediaId: null,
    });
    await prisma.newsArticle.update({
      where: { id: draft.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    return {
      ...draft,
      document,
      // Legacy node fixtures exercise only the inherited attachment component.
      // Storage and public Full News always use the canonical authored document.
      attachmentDocumentJson: JSON.stringify(
        options.legacyNode ? document.content : document,
      ),
    };
  }
  async function attachmentProjection(
    post: Awaited<ReturnType<typeof article>>,
  ) {
    return app
      .get(NewsAttachmentDeliveryService)
      .project(post.id, post.attachmentDocumentJson);
  }
  async function full(slug: string, token?: string) {
    const call = request(app.getHttpServer()).post('/api/graphql');
    if (token) call.set('Authorization', 'Bearer ' + token);
    const response = await call
      .send({
        query:
          'query($slug: String!) { fullNews(language:"uk",slug:$slug) { id documentJson attachments { id mediaId label filename mimeType extension size kind checksumSha256 checksumSha1 checksumMd5 downloadUrl } } }',
        variables: { slug },
      })
      .expect(200);
    return response.body as {
      errors?: Array<{ message: string }>;
      data: {
        fullNews: {
          id: string;
          documentJson: string;
          attachments: Array<{
            id: string;
            mediaId: string;
            label: string;
            filename: string;
            kind: string;
            downloadUrl: string;
            checksumSha256: string;
            checksumSha1: string | null;
            checksumMd5: string | null;
          }>;
        } | null;
      };
    };
  }
  it('publishes exact existing metadata through real Media/News root bindings', async () => {
    const asset = await media();
    const post = await article([attachment(asset.id, 'Manual')]);
    const reference = await prisma.mediaReference.findFirstOrThrow({
      where: { targetId: post.id, mediaId: asset.id },
    });
    const expected = {
      referenceId: reference.id,
      mediaId: asset.id,
      filename: 'manual.pdf',
      mimeType: 'application/pdf',
      extension: 'pdf',
      size: 123,
      checksumSha256: asset.checksum,
      checksumSha1: 'synthetic-sha1',
      checksumMd5: 'synthetic-md5',
      downloadUrl: '/api/media/public/' + asset.id + '/original',
    };
    expect(
      await app
        .get<MediaPublicAttachmentReader>(MEDIA_PUBLIC_ATTACHMENT_READER)
        .read({
          targetType: 'NewsArticle',
          targetId: post.id,
          purpose: 'news.attachment',
          mediaIds: [asset.id],
        }),
    ).toEqual([expected]);
    expect(
      await app
        .get<NewsAttachmentReader>(NEWS_ATTACHMENT_READER)
        .read(post.id, [asset.id]),
    ).toEqual([
      {
        id: reference.id,
        ...Object.fromEntries(
          Object.entries(expected).filter(([key]) => key !== 'referenceId'),
        ),
      },
    ]);
  });
  it('publishes eligible canonical attachments through application and GraphQL after DEBT-051', async () => {
    const asset = await media();
    const post = await article([attachment(asset.id, 'Canonical manual')]);
    expect(
      await prisma.mediaReference.count({
        where: { targetId: post.id, mediaId: asset.id, removedAt: null },
      }),
    ).toBe(1);
    expect(
      await app
        .get<NewsAttachmentReader>(NEWS_ATTACHMENT_READER)
        .read(post.id, [asset.id]),
    ).toHaveLength(1);
    const read = jest.spyOn(
      app.get<NewsAttachmentReader>(NEWS_ATTACHMENT_READER),
      'read',
    );
    expect((await delivery.fullBySlug('uk', post.slug))?.attachments).toEqual([
      expect.objectContaining({ mediaId: asset.id, label: 'Canonical manual' }),
    ]);
    const response = await full(post.slug);
    expect(response.errors).toBeUndefined();
    expect(response.data.fullNews?.attachments).toEqual([
      expect.objectContaining({ mediaId: asset.id, label: 'Canonical manual' }),
    ]);
    expect(read.mock.calls).toEqual([
      [post.id, [asset.id]],
      [post.id, [asset.id]],
    ]);
  });
  it('preserves legacy node component metadata, labels, checksums and provider-field isolation', async () => {
    const first = await media();
    const second = await media();
    const post = await article(
      [
        attachment(first.id, 'First'),
        attachment(second.id, 'Second'),
        attachment(first.id, 'Last label'),
      ],
      { legacyNode: true },
    );
    const projected = await attachmentProjection(post);
    expect(projected.map((item) => [item.mediaId, item.label])).toEqual([
      [first.id, 'Last label'],
      [second.id, 'Second'],
    ]);
    expect(projected[0]).toMatchObject({
      filename: 'manual.pdf',
      kind: 'PDF document',
      checksumSha256: first.checksum,
      checksumSha1: 'synthetic-sha1',
      checksumMd5: 'synthetic-md5',
      downloadUrl: '/api/media/public/' + first.id + '/original',
    });
    for (const marker of [
      'storageKey',
      'synthetic-private-bucket',
      'metadata',
      'not-for-readers',
    ])
      expect(JSON.stringify(projected)).not.toContain(marker);
  });
  it.each([
    'PENDING',
    'UPLOADING',
    'PROCESSING',
    'FAILED',
    'REJECTED',
    'QUARANTINED',
    'DELETING',
    'DELETED',
  ] as const)(
    'omits %s files without altering publication workflow or reference data',
    async (status) => {
      const asset = await media(status);
      const post = await article([attachment(asset.id, 'File')]);
      expect(await attachmentProjection(post)).toEqual([]);
      const response = await full(post.slug);
      expect(response.errors).toBeUndefined();
      expect(response.data.fullNews?.attachments).toEqual([]);
      expect(
        await prisma.mediaReference.count({
          where: { targetId: post.id, mediaId: asset.id, removedAt: null },
        }),
      ).toBe(1);
    },
  );
  it.each(['PRIVATE', 'AUTHENTICATED', 'RESTRICTED'] as const)(
    'does not expose %s attachment metadata even to a logged-in author',
    async (visibility) => {
      const asset = await media('READY', visibility);
      const post = await article([attachment(asset.id, 'File')]);
      expect(await attachmentProjection(post)).toEqual([]);
      expect(
        (await full(post.slug, owner.tokens.accessToken)).data.fullNews
          ?.attachments,
      ).toEqual([]);
    },
  );
  it.each(['removed', 'deleted', 'target', 'purpose', 'type', 'missing'])(
    'preserves exclusion for %s reference/file evidence',
    async (kind) => {
      const asset = await media();
      const post = await article([attachment(asset.id, 'File')]);
      const reference = await prisma.mediaReference.findFirstOrThrow({
        where: { targetId: post.id, mediaId: asset.id },
      });
      if (kind === 'deleted')
        await prisma.media.update({
          where: { id: asset.id },
          data: { deletedAt: new Date() },
        });
      else if (kind === 'missing')
        await prisma.mediaReference.delete({ where: { id: reference.id } });
      else
        await prisma.mediaReference.update({
          where: { id: reference.id },
          data:
            kind === 'removed'
              ? { removedAt: new Date() }
              : kind === 'target'
                ? { targetId: randomUUID() }
                : kind === 'purpose'
                  ? { purpose: 'other' }
                  : { targetType: 'Other' },
        });
      expect(await attachmentProjection(post)).toEqual([]);
      const response = await full(post.slug);
      expect(response.errors).toBeUndefined();
      expect(response.data.fullNews?.attachments).toEqual([]);
    },
  );
  it('skips metadata behind a contentGate while keeping ordinary legacy-node attachments', async () => {
    const visible = await media();
    const hidden = await media();
    const gate = await app.get(ContentGatesService).create({
      ownerId: owner.user.id,
      operator: 'ALL',
      requirements: [{ kind: 'COMMENTS', threshold: 100, groupKey: null }],
    });
    const post = await article(
      [
        attachment(visible.id, 'Visible'),
        {
          type: 'contentGate',
          attrs: { gateId: gate.id },
          content: [attachment(hidden.id, 'Hidden')],
        },
      ],
      { legacyNode: true },
    );
    const read = jest.spyOn(
      app.get<NewsAttachmentReader>(NEWS_ATTACHMENT_READER),
      'read',
    );
    expect(
      (await attachmentProjection(post)).map((item) => item.mediaId),
    ).toEqual([visible.id]);
    expect(read.mock.calls).toEqual([[post.id, [visible.id]]]);
  });
  it('preserves article audience filtering before any attachment metadata read', async () => {
    const asset = await media();
    const post = await article([attachment(asset.id, 'Member file')], {
      legacyNode: true,
      visibility: 'MEMBERS',
    });
    const read = jest.spyOn(
      app.get<NewsAttachmentReader>(NEWS_ATTACHMENT_READER),
      'read',
    );
    expect(await delivery.fullBySlug('uk', post.slug)).toBeNull();
    expect(read).not.toHaveBeenCalled();
    expect(
      await delivery.fullBySlug('uk', post.slug, owner.user.id),
    ).not.toBeNull();
    expect(
      (await full(post.slug, owner.tokens.accessToken)).data.fullNews
        ?.attachments,
    ).toEqual([expect.objectContaining({ mediaId: asset.id })]);
    expect(await attachmentProjection(post)).toHaveLength(1);
  });
  it('does not invoke Media for missing articles or documents without attachments', async () => {
    const post = await article([]);
    const read = jest.spyOn(
      app.get<NewsAttachmentReader>(NEWS_ATTACHMENT_READER),
      'read',
    );
    expect(
      await delivery.fullBySlug('uk', 'missing-' + randomUUID()),
    ).toBeNull();
    expect((await delivery.fullBySlug('uk', post.slug))?.attachments).toEqual(
      [],
    );
    expect(read).not.toHaveBeenCalled();
  });
  it('propagates real metadata provider errors from the attachment component', async () => {
    const asset = await media();
    const post = await article([attachment(asset.id, 'File')], {
      legacyNode: true,
    });
    jest
      .spyOn(
        app.get<MediaPublicAttachmentReader>(MEDIA_PUBLIC_ATTACHMENT_READER),
        'read',
      )
      .mockRejectedValue(new Error('Synthetic metadata provider failure'));
    await expect(attachmentProjection(post)).rejects.toThrow(
      'Synthetic metadata provider failure',
    );
  });
  it('delivers canonical duplicate/nested attachments in first-position/last-label order without changing stored evidence', async () => {
    const first = await media();
    const second = await media();
    const post = await article([
      attachment(first.id, 'First label'),
      { type: 'blockquote', content: [attachment(second.id, 'Second label')] },
      attachment(first.id, 'Last label'),
    ]);
    const before = await prisma.newsArticle.findUniqueOrThrow({
      where: { id: post.id },
    });
    const references = await prisma.mediaReference.findMany({
      where: { targetId: post.id },
      orderBy: { id: 'asc' },
    });
    const revisions = await prisma.newsRevision.count({
      where: { articleId: post.id },
    });
    const response = await full(post.slug);
    expect(response.errors).toBeUndefined();
    expect(
      response.data.fullNews?.attachments.map(({ mediaId, label }) => [
        mediaId,
        label,
      ]),
    ).toEqual([
      [first.id, 'Last label'],
      [second.id, 'Second label'],
    ]);
    for (const value of [
      'storageKey',
      'synthetic-private-bucket',
      'not-for-readers',
    ])
      expect(JSON.stringify(response.data.fullNews?.attachments)).not.toContain(
        value,
      );
    expect(
      await prisma.newsArticle.findUniqueOrThrow({ where: { id: post.id } }),
    ).toEqual(before);
    expect(
      await prisma.mediaReference.findMany({
        where: { targetId: post.id },
        orderBy: { id: 'asc' },
      }),
    ).toEqual(references);
    expect(
      await prisma.newsRevision.count({ where: { articleId: post.id } }),
    ).toBe(revisions);
  });
  it('excludes canonical gated attachments for both guest and author without allowing hidden labels to overwrite visible ones', async () => {
    const visible = await media();
    const hidden = await media();
    const gate = await app.get(ContentGatesService).create({
      ownerId: owner.user.id,
      operator: 'ALL',
      requirements: [{ kind: 'COMMENTS', threshold: 100, groupKey: null }],
    });
    const post = await article([
      attachment(visible.id, 'Visible label'),
      {
        type: 'contentGate',
        attrs: { gateId: gate.id },
        content: [
          attachment(hidden.id, 'Synthetic hidden label'),
          attachment(visible.id, 'Synthetic hidden overwrite'),
        ],
      },
    ]);
    const read = jest.spyOn(
      app.get<NewsAttachmentReader>(NEWS_ATTACHMENT_READER),
      'read',
    );
    for (const token of [undefined, owner.tokens.accessToken]) {
      const response = await full(post.slug, token);
      expect(response.errors).toBeUndefined();
      expect(response.data.fullNews?.attachments).toEqual([
        expect.objectContaining({
          mediaId: visible.id,
          label: 'Visible label',
        }),
      ]);
      expect(response.data.fullNews?.documentJson.includes(hidden.id)).toBe(
        Boolean(token),
      );
    }
    expect(read.mock.calls).toEqual([
      [post.id, [visible.id]],
      [post.id, [visible.id]],
    ]);
  });
  it('rechecks canonical media and reference eligibility on subsequent requests with the same JWT', async () => {
    const asset = await media();
    const post = await article([attachment(asset.id, 'Current file')]);
    const reference = await prisma.mediaReference.findFirstOrThrow({
      where: { targetId: post.id, mediaId: asset.id },
    });
    async function expectCount(count: number) {
      const response = await full(post.slug, owner.tokens.accessToken);
      expect(response.errors).toBeUndefined();
      expect(response.data.fullNews?.attachments).toHaveLength(count);
    }
    await expectCount(1);
    await prisma.media.update({
      where: { id: asset.id },
      data: { status: 'QUARANTINED' },
    });
    await expectCount(0);
    await prisma.media.update({
      where: { id: asset.id },
      data: { status: 'READY', visibility: 'PRIVATE' },
    });
    await expectCount(0);
    await prisma.media.update({
      where: { id: asset.id },
      data: { visibility: 'PUBLIC' },
    });
    await expectCount(1);
    await prisma.mediaReference.update({
      where: { id: reference.id },
      data: { removedAt: new Date() },
    });
    await expectCount(0);
  });
  it('fails canonical public delivery closed when the real Media metadata provider is unavailable', async () => {
    const asset = await media();
    const post = await article([attachment(asset.id, 'Current file')]);
    jest
      .spyOn(
        app.get<MediaPublicAttachmentReader>(MEDIA_PUBLIC_ATTACHMENT_READER),
        'read',
      )
      .mockRejectedValue(new Error('Synthetic canonical metadata outage'));
    await expect(delivery.fullBySlug('uk', post.slug)).rejects.toThrow(
      'Synthetic canonical metadata outage',
    );
    const response = await full(post.slug);
    expect(response.errors?.length).toBeGreaterThan(0);
    expect(response.data.fullNews).toBeNull();
  });
  it('removes denied protected text at the public Full News boundary', async () => {
    const gate = await app.get(ContentGatesService).create({
      ownerId: owner.user.id,
      operator: 'ALL',
      requirements: [{ kind: 'COMMENTS', threshold: 100, groupKey: null }],
    });
    const secret = 'DSS-SYNTHETIC-GATED-FIXTURE-NOT-USER-DATA';
    const post = await article([
      {
        type: 'contentGate',
        attrs: { gateId: gate.id },
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: secret }] },
        ],
      },
    ]);
    const safe = await app
      .get(EditorContentDeliveryService)
      .project(JSON.stringify(post.document), null);
    expect(safe.documentJson).not.toContain(secret);
    const response = await full(post.slug);
    expect(response.errors).toBeUndefined();
    expect(response.data.fullNews?.documentJson).not.toContain(secret);
    expect(
      JSON.parse(response.data.fullNews?.documentJson ?? 'null') as unknown,
    ).toEqual(JSON.parse(safe.documentJson) as unknown);
  });
});
