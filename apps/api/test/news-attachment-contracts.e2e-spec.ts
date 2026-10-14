/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Attachment E2E
 * 📄 File: apps/api/test/news-attachment-contracts.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies public attachment owner metadata and characterizes inherited canonical/gate delivery defects.
 *
 * 🧠 Responsibilities:
 * • exercises actual News/Media root bindings and all real migrations;
 * • distinguishes legacy doc-node fixtures from canonical creation and protected delivery.
 *
 * 🏗️ Architecture:
 * AppModule E2E in an owned disposable schema; no production policy is stubbed into success.
 *
 * ⚠️ Important:
 * Characterization of inherited defects is not security acceptance or permission to fix them.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { Prisma, type MediaStatus, type MediaVisibility } from '@prisma/client';
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
        ...(options.legacyNode
          ? { document: document.content as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
    return { ...draft, document };
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
  it('characterizes inherited canonical-wrapper omission without claiming DEBT-051 fixed', async () => {
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
    expect((await delivery.fullBySlug('uk', post.slug))?.attachments).toEqual(
      [],
    );
    const response = await full(post.slug);
    expect(response.errors).toBeUndefined();
    expect(response.data.fullNews?.attachments).toEqual([]);
    expect(read).not.toHaveBeenCalled();
  });
  it('preserves legacy doc-node attachment transport, labels, checksums and provider-field isolation', async () => {
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
    const response = await full(post.slug);
    expect(response.errors).toBeUndefined();
    expect(
      response.data.fullNews?.attachments.map((item) => [
        item.mediaId,
        item.label,
      ]),
    ).toEqual([
      [first.id, 'Last label'],
      [second.id, 'Second'],
    ]);
    expect(response.data.fullNews?.attachments[0]).toMatchObject({
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
      expect(JSON.stringify(response)).not.toContain(marker);
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
      const post = await article([attachment(asset.id, 'File')], {
        legacyNode: true,
      });
      expect((await delivery.fullBySlug('uk', post.slug))?.attachments).toEqual(
        [],
      );
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
      const post = await article([attachment(asset.id, 'File')], {
        legacyNode: true,
      });
      expect(
        (await delivery.fullBySlug('uk', post.slug, owner.user.id))
          ?.attachments,
      ).toEqual([]);
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
      const post = await article([attachment(asset.id, 'File')], {
        legacyNode: true,
      });
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
      expect((await delivery.fullBySlug('uk', post.slug))?.attachments).toEqual(
        [],
      );
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
      (await delivery.fullBySlug('uk', post.slug))?.attachments.map(
        (item) => item.mediaId,
      ),
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
      (await delivery.fullBySlug('uk', post.slug, owner.user.id))?.attachments,
    ).toHaveLength(1);
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
  it('propagates provider errors rather than returning a partial successful full article', async () => {
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
    await expect(delivery.fullBySlug('uk', post.slug)).rejects.toThrow(
      'Synthetic metadata provider failure',
    );
    const response = await full(post.slug);
    expect(response.errors?.length).toBeGreaterThan(0);
    expect(response.data.fullNews).toBeNull();
  });
  it('characterizes inherited public Full News gate leakage against the functioning Editor redaction boundary', async () => {
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
    // Characterization only: release acceptance is blocked until the separately approved correction.
    expect(response.data.fullNews?.documentJson).toContain(secret);
  });
});
