/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Research Lab RL-1 E2E
 * 📄 File: apps/api/test/research-lab-commands.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Proves private drafts, optimistic writes and serialized review decisions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { createEmptyEditorDocument } from '@dss/editor';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import type { EditorDocumentNormalizer } from '@api/modules/editor';
import type { ResearchLabAuthorityDecisions } from '@api/modules/research-lab';
import { ResearchLabService } from '@api/modules/research-lab/infrastructure/prisma-research-lab-workflow';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Research Lab commands (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let service: ResearchLabService;
  const authenticated = new Set<string>();
  const guardians = new Set<string>();
  const document = createEmptyEditorDocument('WIKI');

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const authority: ResearchLabAuthorityDecisions = {
      viewerFacts: (subjectId) =>
        Promise.resolve({
          authenticated: !!subjectId && authenticated.has(subjectId),
          groups: [],
          premium: false,
          guardian: !!subjectId && guardians.has(subjectId),
        }),
    };
    const editor: EditorDocumentNormalizer = {
      normalizeNews: jest.fn(),
      normalizeComment: jest.fn(),
      normalizeWiki: () => ({
        document,
        canonicalJson: JSON.stringify(document),
        plainText: '',
        searchText: '',
      }),
    };
    service = new ResearchLabService(
      fixture.prisma,
      editor,
      authority,
      new AuditWriterService(new AuditRedactionService()),
      new OutboxWriterService(),
    );
  }, 60000);

  afterAll(async () => {
    await fixture?.close();
  });

  async function user(guardian = false): Promise<string> {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `research-${id}@dss.test`,
        username: `research-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    authenticated.add(id);
    if (guardian) guardians.add(id);
    return id;
  }

  function content(slug: string, title = 'Research title') {
    return {
      title,
      summary: 'Summary',
      proposedSlug: slug,
      documentJson: JSON.stringify(document),
    };
  }

  it('keeps drafts private and permits only one compare-and-swap save', async () => {
    const author = await user();
    const stranger = await user();
    const created = await service.createDraft({
      actorId: author,
      ...content(`private-${randomUUID()}`),
    });

    await expect(
      service.ownDraft(stranger, created.pageId),
    ).resolves.toBeNull();
    const attempts = await Promise.allSettled([
      service.saveDraft({
        actorId: author,
        pageId: created.pageId,
        expectedVersion: 1,
        ...content(`private-a-${randomUUID()}`, 'First'),
      }),
      service.saveDraft({
        actorId: author,
        pageId: created.pageId,
        expectedVersion: 1,
        ...content(`private-b-${randomUUID()}`, 'Second'),
      }),
    ]);
    expect(
      attempts.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    expect(attempts.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    const stored = await service.ownDraft(author, created.pageId);
    expect(stored?.version).toBe(2);
  });

  it('freezes a submission and serializes concurrent Guardian decisions', async () => {
    const author = await user();
    const guardian = await user(true);
    const created = await service.createDraft({
      actorId: author,
      ...content(`review-${randomUUID()}`),
    });
    const submitted = await service.submitDraft({
      actorId: author,
      pageId: created.pageId,
      expectedVersion: 1,
      editSummary: 'Submit for review',
      policySnapshotHash: 'policy-v1',
      correlationId: randomUUID(),
    });
    const decision = {
      actorId: guardian,
      pageId: created.pageId,
      revisionId: submitted.revisionId,
      policySnapshotHash: 'policy-v1',
      correlationId: randomUUID(),
    };
    const attempts = await Promise.allSettled([
      service.publishRevision(decision),
      service.rejectRevision({ ...decision, correlationId: randomUUID() }),
    ]);
    expect(
      attempts.filter(({ status }) => status === 'fulfilled'),
    ).toHaveLength(1);
    expect(attempts.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    const revision = await fixture.prisma.researchRevision.findUniqueOrThrow({
      where: { id: submitted.revisionId },
    });
    expect(['PUBLISHED', 'REJECTED']).toContain(revision.state);
    expect(
      await fixture.prisma.researchReviewDecision.count({
        where: { revisionId: submitted.revisionId },
      }),
    ).toBe(2);
  });

  it('allows explicit Guardian self-publish with complete decision history', async () => {
    const guardian = await user(true);
    const created = await service.createDraft({
      actorId: guardian,
      ...content(`guardian-${randomUUID()}`),
    });
    const published = await service.selfPublishDraft({
      actorId: guardian,
      pageId: created.pageId,
      expectedVersion: 1,
      editSummary: 'Guardian edit',
      policySnapshotHash: 'policy-v1',
      correlationId: randomUUID(),
    });
    const page = await fixture.prisma.researchPage.findUniqueOrThrow({
      where: { id: created.pageId },
    });
    expect(page).toMatchObject({
      state: 'ACTIVE',
      publishedRevisionId: published.revisionId,
      publicationGeneration: 1,
    });
    const decisions = await fixture.prisma.researchReviewDecision.findMany({
      where: { revisionId: published.revisionId },
      orderBy: { createdAt: 'asc' },
      select: { action: true, actorId: true },
    });
    expect(decisions).toEqual([
      { action: 'SUBMITTED', actorId: guardian },
      { action: 'PUBLISHED', actorId: guardian },
    ]);
    const contributor = await user();
    await expect(
      service.startDraft(contributor, created.pageId),
    ).resolves.toMatchObject({ pageId: created.pageId, version: 1 });
  });

  it('opens a fresh private draft when a Guardian requests changes', async () => {
    const author = await user();
    const guardian = await user(true);
    const created = await service.createDraft({
      actorId: author,
      ...content(`changes-${randomUUID()}`),
    });
    const submitted = await service.submitDraft({
      actorId: author,
      pageId: created.pageId,
      expectedVersion: 1,
      editSummary: 'Needs review',
      policySnapshotHash: 'policy-v1',
      correlationId: randomUUID(),
    });
    await service.requestChanges({
      actorId: guardian,
      pageId: created.pageId,
      revisionId: submitted.revisionId,
      reason: 'Add sources',
      policySnapshotHash: 'policy-v1',
      correlationId: randomUUID(),
    });
    await expect(
      service.ownDraft(author, created.pageId),
    ).resolves.toMatchObject({
      version: 1,
      title: 'Research title',
    });
    await expect(
      fixture.prisma.researchRevision.findUniqueOrThrow({
        where: { id: submitted.revisionId },
      }),
    ).resolves.toMatchObject({ state: 'CHANGES_REQUESTED' });
  });

  it('fails closed when Guardian authority is revoked before a read', async () => {
    const guardian = await user(true);
    guardians.delete(guardian);
    await expect(service.reviewQueue(guardian)).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    });
  });
});
