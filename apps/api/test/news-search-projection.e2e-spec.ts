/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Search Security E2E
 * 📄 File: apps/api/test/news-search-projection.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies the News-owned search projection port through real root bindings and access policy.
 *
 * 🧠 Responsibilities:
 * • checks public projection without policy access and live viewer eligibility;
 * • covers author/Premium/GROUP, revocation, expiry and provider failures.
 *
 * 🏗️ Architecture:
 * Real AppModule and migrations in an owned disposable schema; synthetic content only.
 *
 * ⚠️ Important:
 * This verifies the projection boundary, not yet News query/count/pagination or performance.
 * No policy provider is mocked into successful authorization.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { createEmptyEditorDocument } from '@dss/editor';
import { PrismaService } from '@api/core/database';
import {
  CONTENT_GATE_DECISIONS,
  type ContentGateDecisions,
} from '@api/modules/content-access';
import {
  NEWS_SEARCH_PROJECTOR,
  type NewsSearchProjector,
} from '@api/modules/news';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { ContentGatesService } from '../src/modules/content-access/application/services/content-gates.service';
import { AccessGroupsService } from '../src/modules/iam/access-groups/application/access-groups.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('News search projection root boundary (e2e)', () => {
  let app: INestApplication;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let projector: NewsSearchProjector;
  let groups: AccessGroupsService;
  let author: string;
  let premiumId: string;
  const secret = 'synthetic protected search payload';

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
    projector = app.get<NewsSearchProjector>(NEWS_SEARCH_PROJECTOR);
    groups = app.get(AccessGroupsService);
    author = await register();
    const permission = await fixture.prisma.permission.create({
      data: { key: 'permissions.manage', label: 'Synthetic group management' },
    });
    await fixture.prisma.userPermission.create({
      data: { userId: author, permissionId: permission.id },
    });
    premiumId = (
      await fixture.prisma.accessGroup.findUniqueOrThrow({
        where: { key: 'premium' },
      })
    ).id;
  }, 60000);

  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });

  async function register(): Promise<string> {
    const id = randomUUID();
    return (
      await app.get(AuthenticationPresentationService).register({
        email: 'search-' + id + '@dss.test',
        username: 'search-' + id,
        displayName: 'Synthetic Search Pilot',
        password: 'synthetic-search-password-123',
      })
    ).user.id;
  }

  async function grant(groupId: string, subjectId: string, expired = false) {
    const now = Date.now();
    return groups.grant(author, {
      groupId,
      subjectId,
      validFrom: new Date(now - 60000),
      validUntil: expired ? new Date(now - 30000) : null,
    });
  }

  async function input(groupKey?: string, threshold = 100) {
    const gate = await app.get(ContentGatesService).create({
      ownerId: author,
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
    const document = createEmptyEditorDocument('NEWS');
    document.content.content = [
      { type: 'paragraph', content: [{ type: 'text', text: 'alpha' }] },
      {
        type: 'contentGate',
        attrs: { gateId: gate.id },
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: secret }] },
        ],
      },
      { type: 'paragraph', content: [{ type: 'text', text: 'gamma' }] },
    ];
    return { raw: JSON.stringify(document), gate };
  }

  async function audience() {
    return groups.create(author, {
      key: 'search-' + randomUUID(),
      displayName: 'Synthetic search audience',
      capabilities: [],
    });
  }

  it('builds public evidence through the real root binding without any ContentAccess evaluation', async () => {
    const { raw } = await input();
    const decisions = jest.spyOn(
      app.get<ContentGateDecisions>(CONTENT_GATE_DECISIONS),
      'evaluate',
    );
    expect(projector.projectPublic(raw)).toEqual({
      searchText: 'alpha gamma',
      hasContentGates: true,
    });
    expect(decisions).not.toHaveBeenCalled();
    expect(raw).toContain(secret);
  });

  it.each([0, 100])(
    'uses the real numeric decision at threshold %s before projecting viewer text',
    async (threshold) => {
      const viewer = await register();
      const { raw } = await input(undefined, threshold);
      const projected = await projector.projectForViewer(raw, viewer);
      expect(projected).toEqual({
        searchText: threshold === 0 ? `alpha ${secret} gamma` : 'alpha gamma',
      });
    },
  );

  it('preserves author numeric bypass and does not reuse it for another viewer', async () => {
    const viewer = await register();
    const { raw } = await input();
    expect(
      (await projector.projectForViewer(raw, author)).searchText,
    ).toContain(secret);
    expect(await projector.projectForViewer(raw, viewer)).toEqual({
      searchText: 'alpha gamma',
    });
    expect(projector.projectPublic(raw)).toEqual({
      searchText: 'alpha gamma',
      hasContentGates: true,
    });
  });

  it('does not let Premium or author bypass GROUP, and observes grant/revoke on subsequent requests', async () => {
    const group = await audience();
    const viewer = await register();
    await grant(premiumId, viewer);
    const { raw } = await input(group.key);
    expect(
      (await projector.projectForViewer(raw, viewer)).searchText,
    ).not.toContain(secret);
    expect(
      (await projector.projectForViewer(raw, author)).searchText,
    ).not.toContain(secret);
    const membership = await grant(group.id, viewer);
    expect(
      (await projector.projectForViewer(raw, viewer)).searchText,
    ).toContain(secret);
    await groups.revoke(
      author,
      membership.id,
      'Synthetic search audience revocation',
    );
    expect(
      (await projector.projectForViewer(raw, viewer)).searchText,
    ).not.toContain(secret);
  });

  it('keeps numeric requirements for ordinary group members and observes Premium revocation', async () => {
    const group = await audience();
    const viewer = await register();
    await grant(group.id, viewer);
    const { raw } = await input(group.key);
    expect(
      (await projector.projectForViewer(raw, viewer)).searchText,
    ).not.toContain(secret);
    const premium = await grant(premiumId, viewer);
    expect(
      (await projector.projectForViewer(raw, viewer)).searchText,
    ).toContain(secret);
    await groups.revoke(
      author,
      premium.id,
      'Synthetic search Premium revocation',
    );
    expect(
      (await projector.projectForViewer(raw, viewer)).searchText,
    ).not.toContain(secret);
  });

  it.each(['audience', 'premium'] as const)(
    'ignores expired %s membership',
    async (expired) => {
      const group = await audience();
      const viewer = await register();
      await grant(group.id, viewer, expired === 'audience');
      await grant(premiumId, viewer, expired === 'premium');
      const { raw } = await input(group.key);
      expect(
        (await projector.projectForViewer(raw, viewer)).searchText,
      ).not.toContain(secret);
    },
  );

  it('fails viewer projection on decision outage while keeping public indexing policy-independent', async () => {
    const viewer = await register();
    const { raw } = await input();
    const decisions = jest
      .spyOn(app.get<ContentGateDecisions>(CONTENT_GATE_DECISIONS), 'evaluate')
      .mockRejectedValue(new Error('Synthetic search policy outage'));
    expect(projector.projectPublic(raw)).toEqual({
      searchText: 'alpha gamma',
      hasContentGates: true,
    });
    expect(decisions).not.toHaveBeenCalled();
    await expect(projector.projectForViewer(raw, viewer)).rejects.toThrow(
      'Synthetic search policy outage',
    );
  });
});
