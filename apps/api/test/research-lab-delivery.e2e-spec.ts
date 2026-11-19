import { ResearchLabDelivery } from '../src/modules/research-lab/infrastructure/research-lab-delivery';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { ResearchLabService } from '../src/modules/research-lab/infrastructure/prisma-research-lab-workflow';
import type { App } from 'supertest/types';
import type { Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createEmptyEditorDocument } from '@dss/editor';
import { AppModule } from '../src/app.module';
import { PrismaService } from '@api/core/database';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type GraphqlEnvelope<T = Record<string, unknown>> = {
  data: T;
  errors: { message: string; extensions: { code: string } }[];
};
function payload<T = Record<string, unknown>>(response: {
  body: unknown;
}): GraphqlEnvelope<T> {
  return response.body as GraphqlEnvelope<T>;
}
describe('Research Lab public delivery (GraphQL)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: () => Promise.resolve('') })
      .compile();
    app = module.createNestApplication();
    await app.init();
  }, 60000);
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });
  it('removes the entire result and its count after an audience change', async () => {
    const id = randomUUID(),
      author = randomUUID(),
      slug = 'wiki-' + id,
      term = 'Дослідження';
    await fixture.prisma.user.create({
      data: {
        id: author,
        email: author + '@dss.test',
        username: author,
        passwordHash: 'fixture',
      },
    });
    const target = await fixture.prisma.interactionTarget.create({
      data: {
        kind: 'research-lab.page',
        ownerModule: 'research-lab',
        ownerType: 'ResearchPage',
        ownerId: id,
      },
    });
    await fixture.prisma.researchPage.create({
      data: { id, slug, creatorId: author, interactionTargetId: target.id },
    });
    const gate = await fixture.prisma.contentGate.create({
      data: {
        ownerId: author,
        operator: 'ALL',
        requirements: { create: { kind: 'GROUP', groupKey: 'group:editors' } },
      },
    });
    const hidden = 'private-block-' + id;
    const wiki = createEmptyEditorDocument('WIKI');
    wiki.content.content = [
      {
        type: 'contentGate',
        attrs: { gateId: gate.id },
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: hidden }] },
        ],
      },
    ];
    const revision = await fixture.prisma.researchRevision.create({
      data: {
        pageId: id,
        number: 1,
        authorId: author,
        title: term,
        summary: 'Summary',
        proposedSlug: slug,
        document: wiki as unknown as Prisma.InputJsonValue,
        plainText: '',
        searchText: '',
        editSummary: 'Initial',
        contentHash: 'a'.repeat(64),
        state: 'PUBLISHED',
      },
    });
    const now = new Date();
    await fixture.prisma.researchPage.update({
      where: { id },
      data: {
        state: 'ACTIVE',
        publishedRevisionId: revision.id,
        firstPublishedAt: now,
        lastPublishedAt: now,
        publicationGeneration: 1,
      },
    });
    const gatedSeo = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query:
          'query($id:ID!){researchPageSeo(pageId:$id){title} researchSitemap{id}}',
        variables: { id },
      })
      .expect(200);
    expect(gatedSeo.body).toMatchObject({
      data: { researchPageSeo: null, researchSitemap: [] },
    });
    const read = async () => {
      const res = await request(app.getHttpServer())
        .post('/api/graphql')
        .send({
          query:
            'query($id:ID!,$term:String!){ researchPage(id:$id){id title} researchRevisionHistory(pageId:$id){id} search(term:$term,source:RESEARCH_LAB){items{id revisionId source} total categories{slug total}} }',
          variables: { id, term: term.toLowerCase() },
        })
        .expect(200);
      expect(payload(res).errors).toBeUndefined();
      return payload(res).data;
    };
    expect(await read()).toEqual({
      researchPage: { id, title: term },
      researchRevisionHistory: [],
      search: {
        items: [{ id, revisionId: revision.id, source: 'RESEARCH_LAB' }],
        total: 1,
        categories: [],
      },
    });
    await fixture.prisma.researchPage.update({
      where: { id },
      data: { visibility: 'MEMBERS' },
    });
    expect(await read()).toEqual({
      researchPage: null,
      researchRevisionHistory: [],
      search: { items: [], total: 0, categories: [] },
    });
    const member = await app.get(AuthenticationPresentationService).register({
      email: 'viewer-' + id + '@dss.test',
      username: 'viewer-' + id,
      displayName: 'Viewer',
      password: 'research-fixture-123',
    });
    const childId = randomUUID();
    const childTarget = await fixture.prisma.interactionTarget.create({
      data: {
        kind: 'comment',
        ownerModule: 'interactions',
        ownerType: 'Comment',
        ownerId: childId,
      },
    });
    await fixture.prisma.comment.create({
      data: {
        id: childId,
        authorId: author,
        interactionTargetId: target.id,
        reactionTargetId: childTarget.id,
        body: 'Synthetic comment',
        searchText: 'Synthetic comment',
        document: createEmptyEditorDocument(
          'COMMENT',
        ) as unknown as Prisma.InputJsonValue,
      },
    });
    await expect(
      app.get(ResearchLabService).startDraft(member.user.id, id),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    const hiddenSearch = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + member.tokens.accessToken)
      .send({
        query:
          'query($id:ID!,$term:String!){researchPage(id:$id){documentJson} search(term:$term,source:RESEARCH_LAB){total items{id} categories{slug}}}',
        variables: { id, term: hidden },
      })
      .expect(200);
    expect(
      payload<{ researchPage: { documentJson: string }; search: unknown }>(
        hiddenSearch,
      ).errors,
    ).toBeUndefined();
    expect(
      payload<{ researchPage: { documentJson: string }; search: unknown }>(
        hiddenSearch,
      ).data.researchPage.documentJson,
    ).not.toContain(hidden);
    expect(
      payload<{ researchPage: { documentJson: string }; search: unknown }>(
        hiddenSearch,
      ).data.search,
    ).toEqual({
      total: 0,
      items: [],
      categories: [],
    });
    const discover = async (targetId: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/graphql')
        .set('Authorization', 'Bearer ' + member.tokens.accessToken)
        .send({
          query: 'query($id:ID!){interactionTarget(id:$id){ownerId}}',
          variables: { id: targetId },
        })
        .expect(200);
      return payload(res);
    };
    const access = async (targetId: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/graphql')
        .set('Authorization', 'Bearer ' + member.tokens.accessToken)
        .send({
          query:
            'query($id:ID!){interactionTargetAccess(targetId:$id,capability:READ){allowed target{ownerId}}}',
          variables: { id: targetId },
        })
        .expect(200);
      return payload(res);
    };
    expect(await discover(childTarget.id)).toEqual({
      data: { interactionTarget: { ownerId: childId } },
    });
    expect(await access(childTarget.id)).toEqual({
      data: {
        interactionTargetAccess: {
          allowed: true,
          target: { ownerId: childId },
        },
      },
    });
    const delivery = app.get(ResearchLabDelivery);
    expect(await delivery.history(author, id, 0, 10)).toHaveLength(1);
    expect(await delivery.permits(id, target.id, author, 'READ')).toBe(true);
    await fixture.prisma.researchPage.update({
      where: { id },
      data: {
        state: 'TOMBSTONED',
        visibility: 'PUBLIC',
        tombstonedAt: new Date(),
        tombstonedById: author,
        tombstoneReason: 'Removal',
      },
    });
    expect(await read()).toEqual({
      researchPage: null,
      researchRevisionHistory: [],
      search: { items: [], total: 0, categories: [] },
    });
    for (const targetId of [target.id, childTarget.id]) {
      for (const lookup of [discover, access]) {
        const result = await lookup(targetId);
        expect(result.data).toBeNull();
        expect(result.errors[0].message).toBe(
          'Interaction target was not found.',
        );
      }
      const view = await request(app.getHttpServer())
        .post('/api/graphql')
        .send({
          query:
            'mutation($input:RecordViewInput!){recordInteractionView(input:$input){viewCount}}',
          variables: {
            input: { interactionTargetId: targetId, visitorId: randomUUID() },
          },
        })
        .expect(200);
      expect(payload(view).data).toBeNull();
      expect(payload(view).errors[0].extensions.code).toBe('FORBIDDEN');
    }
    expect(await delivery.page(author, { language: 'uk', slug })).toBeNull();
    expect(await delivery.history(author, id, 0, 10)).toEqual([]);
    expect(
      await delivery.compare(author, id, revision.id, revision.id),
    ).toBeNull();
    for (const action of [
      'READ',
      'COMMENT',
      'BOOKMARK',
      'REACT',
      'SHARE',
    ] as const) {
      expect(await delivery.permits(id, target.id, author, action)).toBe(false);
    }
    expect(
      await fixture.prisma.researchRevision.count({ where: { pageId: id } }),
    ).toBe(1);
  });
  it('keeps exact facets and stable ties across a search batch and on an empty deep page', async () => {
    const db = fixture.prisma;
    const author = randomUUID();
    const category = await db.researchCategory.create({
      data: { slug: 'cursor-' + author, name: 'Cursor' },
    });
    await db.user.create({
      data: {
        id: author,
        email: author + '@dss.test',
        username: author,
        passwordHash: 'fixture',
      },
    });
    const rows = Array.from({ length: 67 }, () => ({
      id: randomUUID(),
      target: randomUUID(),
      revision: randomUUID(),
    }));
    const term = 'Вибірка_%' + author;
    const wiki = createEmptyEditorDocument('WIKI');
    wiki.content.content = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Visible public article' }],
      },
    ];
    const document = wiki as unknown as Prisma.InputJsonValue;
    await db.interactionTarget.createMany({
      data: rows.map((row) => ({
        id: row.target,
        kind: 'research-lab.page',
        ownerModule: 'research-lab',
        ownerType: 'ResearchPage',
        ownerId: row.id,
      })),
    });
    await db.researchPage.createMany({
      data: rows.map((row) => ({
        id: row.id,
        creatorId: author,
        slug: 'cursor-' + row.id,
        interactionTargetId: row.target,
        primaryCategoryId: category.id,
      })),
    });
    await db.researchRevision.createMany({
      data: rows.map((row) => ({
        id: row.revision,
        pageId: row.id,
        number: 1,
        authorId: author,
        title: term,
        summary: '',
        proposedSlug: 'cursor-' + row.id,
        document,
        plainText: '',
        searchText: '',
        editSummary: 'Initial',
        contentHash: 'a'.repeat(64),
        state: 'PUBLISHED' as const,
      })),
    });
    const date = new Date();
    await db.$transaction(
      rows.map((row, index) =>
        db.researchPage.update({
          where: { id: row.id },
          data: {
            state: 'ACTIVE',
            visibility: index === 0 ? 'MEMBERS' : 'PUBLIC',
            publishedRevisionId: row.revision,
            firstPublishedAt: date,
            lastPublishedAt: date,
            publicationGeneration: 1,
          },
        }),
      ),
    );
    const visible = rows
      .slice(1)
      .map((row) => row.id)
      .sort();
    await db.researchInternalLink.createMany({
      data: [rows[0], rows[2]].map((row) => ({
        sourcePageId: rows[1].id,
        targetPageId: row.id,
        anchorText: 'Related',
      })),
    });
    const related = async (pageId: string) => {
      const response = await request(app.getHttpServer())
        .post('/api/graphql')
        .send({
          query: 'query($id:ID!){researchRelatedPages(pageId:$id,limit:1){id}}',
          variables: { id: pageId },
        })
        .expect(200);
      expect(payload(response).errors).toBeUndefined();
      return payload(response).data.researchRelatedPages;
    };
    expect(await related(rows[0].id)).toEqual([]);
    expect(await related(rows[1].id)).toEqual([{ id: rows[2].id }]);
    const seoQuery =
      'query($public:ID!,$members:ID!){open:researchPageSeo(pageId:$public){id slug} closed:researchPageSeo(pageId:$members){id} researchSitemap(limit:100){id}}';
    const seo = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: seoQuery,
        variables: { public: rows[1].id, members: rows[0].id },
      })
      .expect(200);
    expect(payload(seo).errors).toBeUndefined();
    expect(payload(seo).data.open).toEqual({
      id: rows[1].id,
      slug: 'cursor-' + rows[1].id,
    });
    expect(payload(seo).data.closed).toBeNull();
    expect(payload(seo).data.researchSitemap).toEqual(
      visible.map((id) => ({ id })),
    );
    for (const page of [1, 2, 3]) {
      const response = await request(app.getHttpServer())
        .post('/api/graphql')
        .send({
          query:
            'query($term:String!,$page:Int!){search(source:RESEARCH_LAB,term:$term,page:$page,pageSize:50){items{id} total categories{slug total}}}',
          variables: { term: term.toUpperCase(), page },
        })
        .expect(200);
      expect(payload(response).errors).toBeUndefined();
      expect(payload(response).data.search).toEqual({
        items: visible.slice((page - 1) * 50, page * 50).map((id) => ({ id })),
        total: 66,
        categories: [{ slug: category.slug, total: 66 }],
      });
    }
  });
  it('submits an authenticated Wiki draft with server-side decision evidence and requires Guardian for publication', async () => {
    const suffix = randomUUID();
    const member = await app.get(AuthenticationPresentationService).register({
      email: suffix + '@dss.test',
      username: 'research-' + suffix,
      displayName: 'Contributor',
      password: 'research-fixture-123',
    });
    const send = async (query: string, input: Record<string, unknown>) => {
      const response = await request(app.getHttpServer())
        .post('/api/graphql')
        .set('Authorization', 'Bearer ' + member.tokens.accessToken)
        .send({ query, variables: { input } })
        .expect(200);
      return payload<{
        createResearchDraft: { pageId: string; version: number };
        submitResearchDraft: { revisionId: string; state: string };
      }>(response);
    };
    const created = await send(
      'mutation($input:ResearchDraftInput!){createResearchDraft(input:$input){pageId version}}',
      {
        title: 'GraphQL workflow',
        summary: 'Draft',
        proposedSlug: 'workflow-' + suffix,
        documentJson: JSON.stringify(createEmptyEditorDocument('WIKI')),
      },
    );
    expect(created.errors).toBeUndefined();
    const { pageId, version } = created.data.createResearchDraft;
    const submitted = await send(
      'mutation($input:ResearchSubmitInput!){submitResearchDraft(input:$input){revisionId state}}',
      { pageId, expectedVersion: version, editSummary: 'First revision' },
    );
    expect(submitted.errors).toBeUndefined();
    const { revisionId, state } = submitted.data.submitResearchDraft;
    expect(state).toBe('IN_REVIEW');
    expect(
      await fixture.prisma.researchReviewDecision.findFirstOrThrow({
        where: { revisionId },
      }),
    ).toMatchObject({
      actorId: member.user.id,
      policySnapshotHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      auditCorrelationId: expect.any(String),
    });
    const denied = await send(
      'mutation($input:ResearchDecisionInput!){publishResearchRevision(input:$input){state}}',
      { pageId, revisionId },
    );
    expect(denied.errors[0].extensions.code).toBe('FORBIDDEN');
    expect(
      await fixture.prisma.researchPage.findUniqueOrThrow({
        where: { id: pageId },
      }),
    ).toMatchObject({ publishedRevisionId: null, publicationGeneration: 0 });
  });
});
