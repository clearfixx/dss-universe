/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Static Pages
 * 📄 File: apps/api/test/static-pages.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Application-level proof of static pages: drafts stay private, the public
 * page changes only on publish, revisions protect against overwrites.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createEmptyEditorDocument } from '@dss/editor';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { Permission } from './../src/core/authorization';
import { PrismaService } from './../src/core/database';
import { AuthenticationPresentationService } from './../src/composition/identity/application/authentication-presentation.service';
import { EDITOR_CODE_HIGHLIGHTER } from './../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { StaticPagesService } from './../src/modules/static-pages/infrastructure/prisma-static-pages';

describe('Static pages (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: (code: string) => Promise.resolve(code) })
      .compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app?.close();
  });

  const documentJson = (text: string) =>
    JSON.stringify({
      ...createEmptyEditorDocument('ADMIN'),
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
      },
    });

  const publicPage = (slug: string) =>
    request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query:
          'query($slug: String!) { staticPage(slug: $slug) { title documentJson } }',
        variables: { slug },
      })
      .expect(200)
      .then(
        (response) =>
          (
            response.body as {
              data: {
                staticPage: { title: string; documentJson: string } | null;
              };
            }
          ).data.staticPage,
      );

  it('keeps drafts private and publishes snapshots under a revision check', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const session = await app.get(AuthenticationPresentationService).register({
      email: `pages-${suffix}@dss.test`,
      username: `pages-${suffix}`,
      displayName: 'Pages Admin',
      password: 'Pages-admin-password-123!',
    });
    const pages = app.get(StaticPagesService);
    const actor = {
      id: session.user.id,
      permissions: [Permission.CmsPagesManage] as string[],
    };
    const slug = `rules-${suffix}`;
    const input = {
      slug,
      title: 'Rules',
      description: 'How we behave.',
      documentJson: documentJson('First text.'),
    };

    await expect(
      pages.create({ id: actor.id, permissions: [] }, input),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    const denied = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + session.tokens.accessToken)
      .send({ query: '{ adminStaticPages { id } }' });
    expect(
      (denied.body as { errors: Array<{ extensions: { code: string } }> })
        .errors[0].extensions.code,
    ).toBe('FORBIDDEN');

    const created = await pages.create(actor, input);
    expect(created).toMatchObject({ revision: 1, publishedAt: null });
    await expect(pages.create(actor, input)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    await expect(publicPage(slug)).resolves.toBeNull();

    await pages.publish(actor, created.id, 1);
    await expect(publicPage(slug)).resolves.toMatchObject({ title: 'Rules' });

    // A saved change stays in the working copy until the next publish.
    const saved = await pages.save(actor, created.id, 1, {
      ...input,
      title: 'Rules, second edition',
      documentJson: documentJson('Second text.'),
    });
    expect(saved).toMatchObject({ revision: 2, hasUnpublishedChanges: true });
    const live = await publicPage(slug);
    expect(live?.title).toBe('Rules');
    expect(live?.documentJson).toContain('First text.');

    await expect(pages.save(actor, created.id, 1, input)).rejects.toMatchObject(
      { code: 'CONFLICT' },
    );
    await expect(pages.publish(actor, created.id, 1)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    await expect(
      pages.save(actor, created.id, 2, { ...input, slug: `${slug}-moved` }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      pages.save(actor, created.id, 2, {
        ...input,
        documentJson: JSON.stringify({
          ...createEmptyEditorDocument('ADMIN'),
          content: {
            type: 'doc',
            content: [
              {
                type: 'contentGate',
                attrs: { gateId: '7f8c4f3e-6d1a-4b39-9f0e-1c2d3e4f5a6b' },
                content: [{ type: 'paragraph' }],
              },
            ],
          },
        }),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });

    const published = await pages.publish(actor, created.id, 2);
    expect(published.hasUnpublishedChanges).toBe(false);
    expect((await publicPage(slug))?.documentJson).toContain('Second text.');
    expect((await pages.publishedIndex()).map((entry) => entry.slug)).toContain(
      slug,
    );

    await pages.unpublish(actor, created.id);
    await expect(publicPage(slug)).resolves.toBeNull();
    await expect(pages.unpublish(actor, created.id)).rejects.toMatchObject({
      code: 'CONFLICT',
    });

    const audit = await app.get(PrismaService).auditRecord.findMany({
      where: { targetType: 'StaticPage', targetId: created.id },
      orderBy: { occurredAt: 'asc' },
    });
    expect(audit.map(({ action }) => action)).toEqual([
      'cms.page_created',
      'cms.page_published',
      'cms.page_saved',
      'cms.page_published',
      'cms.page_unpublished',
    ]);
  }, 60000);
});
