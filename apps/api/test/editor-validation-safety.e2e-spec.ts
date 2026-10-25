/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Editor validation boundary verification
 * 📄 File: apps/api/test/editor-validation-safety.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Prove malformed editor documents fail through real authenticated HTTP paths.
 *
 * 🧠 Responsibilities:
 * • preserve controlled GraphQL errors without internal stack disclosure;
 * • verify rejected News commands leave content and evidence unchanged;
 * • retain successful depth-64 requests after validation failures.
 *
 * 🏗️ Architecture:
 * Real AppModule, authentication and migrations in one owned disposable schema.
 *
 * ⚠️ Important:
 * No validation/auth mocks, immutable-history bypass, reset or timeout relaxation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
import { EditorService } from '../src/modules/editor/application/services/editor.service';
import { NewsService } from '../src/modules/news/application/services/news.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type GraphqlBody = {
  data: Record<
    string,
    {
      id: string;
      canonicalJson?: string;
      documentJson?: string;
      plainText?: string;
      html?: string;
      currentVersion?: number;
    }
  > | null;
  errors?: {
    message: string;
    extensions: { code: string; statusCode?: number };
  }[];
};

function documentWith(node: unknown): string {
  return JSON.stringify({
    schemaVersion: 1,
    profile: 'NEWS',
    content: { type: 'doc', content: [node] },
  });
}
function nestedJson(depth: number): string {
  return (
    '{"schemaVersion":1,"profile":"NEWS","content":{"type":"doc","content":[' +
    '{"type":"blockquote","content":['.repeat(depth - 2) +
    '{"type":"paragraph","content":[{"type":"text","text":"boundary"}]}' +
    ']}'.repeat(depth - 2) +
    ']}}'
  );
}
const invalidDocuments = [
  ['null child', documentWith(null)],
  ['object content', documentWith({ type: 'paragraph', content: {} })],
  ['object marks', documentWith({ type: 'paragraph', marks: {} })],
  ['null attributes', documentWith({ type: 'paragraph', attrs: null })],
  ['depth 65', nestedJson(65)],
] as const;
const createMutation =
  'mutation($input:CreateNewsDraftInput!){createNewsDraft(input:$input){id documentJson currentVersion}}';
const saveMutation =
  'mutation($input:SaveNewsDraftInput!){saveNewsDraft(input:$input){id documentJson currentVersion}}';

describe('Editor validation HTTP and persistence safety (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let author: Awaited<
    ReturnType<AuthenticationPresentationService['register']>
  >;
  let existingId: string;
  let existingInput: ReturnType<typeof newsInput>;
  const presenceWrites: Promise<void>[] = [];

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    prisma = fixture.prisma;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    const id = randomUUID();
    author = await app.get(AuthenticationPresentationService).register({
      email: `editor-${id}@dss.test`,
      username: `editor-${id}`,
      displayName: 'Synthetic Editor Pilot',
      password: 'synthetic-editor-password-123',
    });
    existingInput = newsInput(nestedJson(2));
    const created = await graphql(createMutation, { input: existingInput });
    expect(created.errors).toBeUndefined();
    existingId = created.data!.createNewsDraft.id;
  }, 60000);

  beforeEach(() => {
    const presence = app.get(UserPresenceService);
    const touch = presence.touch.bind(presence) as UserPresenceService['touch'];
    jest.spyOn(presence, 'touch').mockImplementation((...args) => {
      const pending = touch(...args);
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

  function newsInput(documentJson: string) {
    return {
      postType: 'STANDARD',
      visibility: 'PUBLIC',
      language: 'uk',
      slug: 'editor-' + randomUUID(),
      title: 'Synthetic editor validation',
      shortText: 'Synthetic canonical document boundary.',
      documentJson,
    };
  }
  async function graphql(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<GraphqlBody> {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + author.tokens.accessToken)
      .send({ query, variables })
      .expect(200);
    return response.body as GraphqlBody;
  }
  function denied(body: GraphqlBody) {
    expect(body.data).toBeNull();
    expect(body.errors).toHaveLength(1);
    expect(body.errors![0].message).toBe('Editor document validation failed.');
    expect(body.errors![0].extensions).toEqual({
      code: 'BAD_USER_INPUT',
      statusCode: 400,
    });
    expect(JSON.stringify(body)).not.toMatch(
      /TypeError|RangeError|validation\.ts|stacktrace/,
    );
  }
  async function counts() {
    return Promise.all([
      prisma.newsArticle.count(),
      prisma.newsRevision.count(),
      prisma.comment.count(),
      prisma.commentRevision.count(),
      prisma.interactionTarget.count(),
      prisma.mediaReference.count(),
      prisma.auditRecord.count(),
      prisma.outboxEvent.count(),
    ]);
  }

  it('characterizes the inherited unsupported-node error mapping independently of new safety cases', async () => {
    const json = documentWith({ type: 'html' });
    let caught: unknown;
    try {
      app.get(EditorService).normalize(json);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(BadRequestException);
    expect((caught as BadRequestException).getStatus()).toBe(400);
    expect((caught as BadRequestException).getResponse()).not.toHaveProperty(
      'statusCode',
    );
    const body = await graphql(
      'query($input:PreviewEditorDocumentInput!){previewEditorDocument(input:$input){canonicalJson}}',
      { input: { documentJson: json } },
    );
    expect(body.errors![0].message).toBe('Editor document validation failed.');
    // Characterization, not acceptance: this is the compatibility decision blocking the new assertions.
    expect(body.errors![0].extensions).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
    });
  });

  it.each(invalidDocuments)(
    'rejects %s on preview and delivery without evidence writes',
    async (_label, json) => {
      const before = await counts();
      for (const operation of [
        'previewEditorDocument',
        'deliverEditorDocument',
      ]) {
        const selection =
          operation === 'previewEditorDocument'
            ? 'canonicalJson html plainText'
            : 'documentJson';
        denied(
          await graphql(
            `query($input:PreviewEditorDocumentInput!){${operation}(input:$input){${selection}}}`,
            { input: { documentJson: json } },
          ),
        );
      }
      expect(await counts()).toEqual(before);
    },
  );

  it.each(invalidDocuments)(
    'rejects %s on News creation without partial persistence',
    async (_label, json) => {
      const before = await counts();
      denied(await graphql(createMutation, { input: newsInput(json) }));
      expect(await counts()).toEqual(before);
    },
  );

  it.each(invalidDocuments)(
    'rejects %s on News save without changing the existing draft',
    async (_label, json) => {
      const before = await counts();
      const article = await prisma.newsArticle.findUniqueOrThrow({
        where: { id: existingId },
      });
      denied(
        await graphql(saveMutation, {
          input: {
            ...existingInput,
            documentJson: json,
            articleId: existingId,
            baseVersion: 1,
          },
        }),
      );
      expect(await counts()).toEqual(before);
      expect(
        await prisma.newsArticle.findUniqueOrThrow({
          where: { id: existingId },
        }),
      ).toEqual(article);
    },
  );

  it.each(invalidDocuments)(
    'independent host persistence: rejects %s without changing content or evidence',
    async (_label, json) => {
      const news = app.get(NewsService);
      const before = await counts();
      const article = await prisma.newsArticle.findUniqueOrThrow({
        where: { id: existingId },
      });
      await expect(
        news.createDraft({
          ...newsInput(json),
          postType: 'STANDARD',
          visibility: 'PUBLIC',
          authorId: author.user.id,
          coverMediaId: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(await counts()).toEqual(before);
      await expect(
        news.saveDraft(author.user.id, {
          ...existingInput,
          postType: 'STANDARD',
          visibility: 'PUBLIC',
          documentJson: json,
          articleId: existingId,
          baseVersion: 1,
          changeSummary: null,
          coverMediaId: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(await counts()).toEqual(before);
      expect(
        await prisma.newsArticle.findUniqueOrThrow({
          where: { id: existingId },
        }),
      ).toEqual(article);
    },
  );

  it('preserves real depth-64 preview and delivery after invalid requests', async () => {
    const json = nestedJson(64);
    const preview = await graphql(
      'query($input:PreviewEditorDocumentInput!){previewEditorDocument(input:$input){canonicalJson html plainText}}',
      { input: { documentJson: json } },
    );
    expect(preview.errors).toBeUndefined();
    expect(preview.data!.previewEditorDocument).toMatchObject({
      canonicalJson: json,
      plainText: 'boundary',
    });
    expect(preview.data!.previewEditorDocument.html).toContain(
      '<p>boundary</p>',
    );
    const delivery = await graphql(
      'query($input:PreviewEditorDocumentInput!){deliverEditorDocument(input:$input){documentJson}}',
      { input: { documentJson: json } },
    );
    expect(delivery.errors).toBeUndefined();
    expect(delivery.data!.deliverEditorDocument.documentJson).toBe(json);
  });

  it('preserves successful host creation and update after invalid requests', async () => {
    const json = nestedJson(64);
    const created = await graphql(createMutation, { input: newsInput(json) });
    expect(created.errors).toBeUndefined();
    expect(created.data!.createNewsDraft).toMatchObject({
      currentVersion: 1,
    });
    expect(
      JSON.parse(created.data!.createNewsDraft.documentJson!) as unknown,
    ).toEqual(JSON.parse(json) as unknown);
    const saved = await graphql(saveMutation, {
      input: {
        ...existingInput,
        documentJson: json,
        articleId: existingId,
        baseVersion: 1,
      },
    });
    expect(saved.errors).toBeUndefined();
    expect(saved.data!.saveNewsDraft).toMatchObject({
      id: existingId,
      currentVersion: 2,
    });
    expect(
      JSON.parse(saved.data!.saveNewsDraft.documentJson!) as unknown,
    ).toEqual(JSON.parse(json) as unknown);
    expect(
      await prisma.newsRevision.count({ where: { articleId: existingId } }),
    ).toBe(2);
    expect(
      await prisma.auditRecord.count({ where: { targetId: existingId } }),
    ).toBeGreaterThan(0);
    expect(
      await prisma.outboxEvent.count({ where: { aggregateId: existingId } }),
    ).toBeGreaterThan(0);
  });
});
