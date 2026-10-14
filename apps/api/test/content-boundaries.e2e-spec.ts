/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Integration E2E
 * 📄 File: apps/api/test/content-boundaries.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies composed redaction, Premium boundaries and canonical News/comment persistence.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createEmptyEditorDocument } from '@dss/editor';
import { PrismaService } from '@api/core/database';
import {
  CONTENT_GATE_DECISIONS,
  type ContentGateDecisions,
} from '@api/modules/content-access';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { ContentGatesService } from '../src/modules/content-access/application/services/content-gates.service';
import { ContentGateDecisionsService } from '../src/modules/content-access/application/services/content-gate-decisions.service';
import { EditorContentDeliveryService } from '../src/modules/editor/application/services/editor-content-delivery.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { CommentDraftsService } from '../src/modules/interactions/application/services/comment-drafts.service';
import { UserWallService } from '../src/modules/users/application/services/user-wall.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type DeliveryData = {
  deliverEditorDocument: {
    documentJson: string;
    gates: Array<{ allowed: boolean; bypassed: boolean; unmet: string[] }>;
  };
};
type NewsDraftData = {
  createNewsDraft: {
    id: string;
    documentJson: string;
    currentVersion: number;
    status: string;
  };
};
type CommentData = {
  createComment: { id: string; body: string; documentJson: string };
};

describe('Content integration composed boundaries (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let owner: Awaited<ReturnType<typeof register>>;
  let viewer: Awaited<ReturnType<typeof register>>;
  let gateId: string;
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
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true,
      }),
    );
    await app.init();
    owner = await register();
    viewer = await register();
    const gates = app.get(ContentGatesService);
    const gate = await gates.create({
      ownerId: owner.user.id,
      operator: 'ALL',
      requirements: [
        { kind: 'GROUP', groupKey: 'group:crew', threshold: null },
        { kind: 'REPUTATION', groupKey: null, threshold: 100 },
      ],
    });
    gateId = gate.id;
  }, 60_000);
  afterAll(async () => {
    jest.restoreAllMocks();
    await app?.close();
    await fixture?.close();
  });
  async function register() {
    const suffix = randomUUID();
    const authentication = app.get(AuthenticationPresentationService);
    return authentication.register({
      email: 'content-' + suffix + '@dss.test',
      username: 'content-' + suffix,
      displayName: 'Content Pilot',
      password: 'content-boundary-fixture-123',
    });
  }
  function documentJson(profile: 'NEWS' | 'COMMENT', gate?: string) {
    const document = createEmptyEditorDocument(profile);
    document.content.content = [
      { type: 'paragraph', content: [{ type: 'text', text: 'Public text' }] },
      ...(gate
        ? [
            {
              type: 'contentGate' as const,
              attrs: { gateId: gate },
              content: [
                {
                  type: 'paragraph' as const,
                  content: [
                    { type: 'text' as const, text: 'Protected payload' },
                  ],
                },
              ],
            },
          ]
        : []),
    ];
    return JSON.stringify(document);
  }
  async function graphql<Data = DeliveryData>(
    token: string,
    query: string,
    variables: Record<string, unknown>,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + token)
      .send({ query, variables })
      .expect(200);
    return {
      body: response.body as {
        data: Data | null;
        errors?: Array<{ message: string }>;
      },
    };
  }
  async function deliver(
    token: string,
    document = documentJson('NEWS', gateId),
  ) {
    return graphql(
      token,
      'query($input: PreviewEditorDocumentInput!) { deliverEditorDocument(input: $input) { documentJson gates { gateId allowed bypassed unmet notice } } }',
      { input: { documentJson: document } },
    );
  }
  it('keeps Premium behind audience, then applies and immediately revokes only its numeric bypass', async () => {
    const premiumViewer = await register();
    const premium = await prisma.accessGroup.findUniqueOrThrow({
      where: { key: 'premium' },
    });
    const crew = await prisma.accessGroup.create({
      data: {
        key: 'crew',
        displayName: 'Crew',
        createdById: owner.user.id,
      },
    });
    const premiumMembership = await prisma.accessGroupMembership.create({
      data: {
        groupId: premium.id,
        subjectId: premiumViewer.user.id,
        grantedById: owner.user.id,
      },
    });
    const denied = await deliver(premiumViewer.tokens.accessToken);
    expect(denied.body.errors).toBeUndefined();
    expect(denied.body.data!.deliverEditorDocument.documentJson).not.toContain(
      'Protected payload',
    );
    expect(denied.body.data!.deliverEditorDocument.gates[0]).toMatchObject({
      allowed: false,
      bypassed: false,
      unmet: ['GROUP'],
    });
    const crewMembership = await prisma.accessGroupMembership.create({
      data: {
        groupId: crew.id,
        subjectId: premiumViewer.user.id,
        grantedById: owner.user.id,
      },
    });
    const allowed = await deliver(premiumViewer.tokens.accessToken);
    expect(allowed.body.errors).toBeUndefined();
    expect(allowed.body.data!.deliverEditorDocument.documentJson).toContain(
      'Protected payload',
    );
    expect(allowed.body.data!.deliverEditorDocument.gates[0]).toMatchObject({
      allowed: true,
      bypassed: true,
    });
    await prisma.accessGroupMembership.update({
      where: { id: crewMembership.id },
      data: {
        revokedAt: new Date(),
        revokedById: owner.user.id,
        revokeReason: 'Fixture audience revoked',
      },
    });
    expect(
      (await deliver(premiumViewer.tokens.accessToken)).body.data!
        .deliverEditorDocument.gates[0],
    ).toMatchObject({ allowed: false, unmet: ['GROUP'] });
    await prisma.accessGroupMembership.create({
      data: {
        groupId: crew.id,
        subjectId: premiumViewer.user.id,
        grantedById: owner.user.id,
      },
    });
    await prisma.accessGroupMembership.update({
      where: { id: premiumMembership.id },
      data: {
        revokedAt: new Date(),
        revokedById: owner.user.id,
        revokeReason: 'Fixture Premium revoked',
      },
    });
    expect(
      (await deliver(premiumViewer.tokens.accessToken)).body.data!
        .deliverEditorDocument.gates[0],
    ).toMatchObject({ allowed: false, bypassed: false, unmet: ['REPUTATION'] });
  });
  it('exports only five verdict fields and preserves guest redaction', async () => {
    const decisions = app.get<ContentGateDecisions>(CONTENT_GATE_DECISIONS);
    const decision = await decisions.evaluate(gateId, null);
    expect(Object.keys(decision).sort()).toEqual([
      'allowed',
      'bypassed',
      'gateId',
      'notice',
      'unmet',
    ]);
    expect(
      (
        await app
          .get(EditorContentDeliveryService)
          .project(documentJson('NEWS', gateId), null)
      ).documentJson,
    ).not.toContain('Protected payload');
  });
  it('evaluates duplicate gates once, skips a denied subtree and does not mutate canonical JSON', async () => {
    const document = createEmptyEditorDocument('NEWS');
    const blocked = JSON.parse(documentJson('NEWS', gateId)) as typeof document;
    const node = blocked.content.content![1];
    const nestedGateId = randomUUID();
    document.content.content = [
      node,
      {
        ...node,
        content: [
          {
            type: 'contentGate',
            attrs: { gateId: nestedGateId },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Nested secret' }],
              },
            ],
          },
        ],
      },
    ];
    const json = JSON.stringify(document);
    const spy = jest.spyOn(app.get(ContentGateDecisionsService), 'evaluate');
    try {
      const response = await deliver(viewer.tokens.accessToken, json);
      expect(response.body.errors).toBeUndefined();
      const result = response.body.data!.deliverEditorDocument;
      expect(result.documentJson).not.toContain('Protected payload');
      expect(result.documentJson).not.toContain('Nested secret');
      expect(result.gates).toHaveLength(1);
      expect(spy.mock.calls).toEqual([[gateId, viewer.user.id]]);
      expect(JSON.stringify(document)).toBe(json);
    } finally {
      spy.mockRestore();
    }
  });
  it.each(['BANNED', 'DEACTIVATED', 'DELETED'] as const)(
    'fails closed for %s viewers without returning document payloads',
    async (status) => {
      const inactive = await register();
      await prisma.user.update({
        where: { id: inactive.user.id },
        data: { status },
      });
      await expect(
        app
          .get(EditorContentDeliveryService)
          .project(documentJson('NEWS', gateId), inactive.user.id),
      ).rejects.toThrow('Content Gate viewer was not found.');
      const response = await deliver(inactive.tokens.accessToken);
      expect(response.body.errors).toBeDefined();
      expect(response.body.data).toBeNull();
    },
  );
  it('returns no success payload for missing gates or unavailable decision evidence', async () => {
    const missing = await deliver(
      viewer.tokens.accessToken,
      documentJson('NEWS', randomUUID()),
    );
    expect(missing.body.errors).toBeDefined();
    expect(missing.body.data).toBeNull();
    const spy = jest
      .spyOn(app.get(ContentGateDecisionsService), 'evaluate')
      .mockRejectedValue(new Error('Synthetic gate unavailable'));
    try {
      const unavailable = await deliver(viewer.tokens.accessToken);
      expect(unavailable.body.errors).toBeDefined();
      expect(unavailable.body.data).toBeNull();
      expect(JSON.stringify(unavailable.body)).not.toContain(
        'Protected payload',
      );
    } finally {
      spy.mockRestore();
    }
  });
  it('preserves News draft GraphQL persistence and rejects a COMMENT profile before any write', async () => {
    const mutation =
      'mutation($input: CreateNewsDraftInput!) { createNewsDraft(input: $input) { id documentJson currentVersion status } }';
    const input = {
      postType: 'STANDARD',
      visibility: 'PUBLIC',
      language: 'uk',
      slug: 'content-' + randomUUID(),
      title: 'Content integration',
      shortText: 'Canonical News persistence.',
      documentJson: documentJson('NEWS'),
    };
    const created = await graphql<NewsDraftData>(
      owner.tokens.accessToken,
      mutation,
      { input },
    );
    expect(created.body.errors).toBeUndefined();
    const article = created.body.data!.createNewsDraft;
    expect(JSON.parse(article.documentJson) as object).toEqual(
      JSON.parse(input.documentJson) as object,
    );
    expect(article).toMatchObject({
      currentVersion: 1,
      status: 'DRAFT',
    });
    expect(await prisma.newsArticle.count({ where: { id: article.id } })).toBe(
      1,
    );
    const before = await prisma.newsArticle.count();
    const denied = await graphql<NewsDraftData>(
      owner.tokens.accessToken,
      mutation,
      {
        input: {
          ...input,
          slug: 'wrong-' + randomUUID(),
          documentJson: documentJson('COMMENT'),
        },
      },
    );
    expect(denied.body.errors?.[0]?.message).toContain(
      'must use the NEWS profile',
    );
    expect(await prisma.newsArticle.count()).toBe(before);
  });
  it('preserves COMMENT create/draft persistence and rejects a NEWS profile before any write', async () => {
    const wall = await app
      .get(UserWallService)
      .create(owner.user.id, owner.user.id, 'Comment target');
    const mutation =
      'mutation($input: CreateCommentInput!) { createComment(input: $input) { id body documentJson } }';
    const input = {
      interactionTargetId: wall.interactionTargetId,
      documentJson: documentJson('COMMENT'),
    };
    const created = await graphql<CommentData>(
      owner.tokens.accessToken,
      mutation,
      { input },
    );
    expect(created.body.errors).toBeUndefined();
    expect(created.body.data!.createComment).toMatchObject({
      body: 'Public text',
    });
    expect(
      JSON.parse(created.body.data!.createComment.documentJson) as object,
    ).toEqual(JSON.parse(input.documentJson) as object);
    const draft = await app
      .get(CommentDraftsService)
      .save(owner.user.id, { ...input, baseVersion: 0 });
    expect(draft).toMatchObject({
      plainText: 'Public text',
      version: 1,
    });
    expect(JSON.parse(draft.documentJson) as object).toEqual(
      JSON.parse(input.documentJson) as object,
    );
    const before = await prisma.comment.count();
    const denied = await graphql<CommentData>(
      owner.tokens.accessToken,
      mutation,
      { input: { ...input, documentJson: documentJson('NEWS') } },
    );
    expect(denied.body.errors?.[0]?.message).toContain(
      'must use the COMMENT profile',
    );
    expect(await prisma.comment.count()).toBe(before);
  });
});
