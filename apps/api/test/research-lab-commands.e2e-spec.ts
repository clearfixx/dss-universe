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
  const memberships = new Map<string, string[]>();
  const deniedDocuments = new Set<string>();
  const guardians = new Set<string>();
  const moderators = new Set<string>();
  const document = createEmptyEditorDocument('WIKI');

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const authority: ResearchLabAuthorityDecisions = {
      canModerate: (id) =>
        Promise.resolve(authenticated.has(id) && moderators.has(id)),
      viewerFacts: (subjectId) =>
        Promise.resolve({
          authenticated: !!subjectId && authenticated.has(subjectId),
          groups: memberships.get(subjectId ?? '') ?? [],
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
      normalizeForumTopic: jest.fn(),
      normalizeForumReply: jest.fn(),
    };
    service = new ResearchLabService(
      fixture.prisma,
      editor,
      authority,
      new AuditWriterService(new AuditRedactionService()),
      new OutboxWriterService(),
      {
        project: (documentJson, actorId) =>
          Promise.resolve({
            documentJson,
            gates: deniedDocuments.has(actorId)
              ? [
                  {
                    gateId: 'fixture',
                    allowed: false,
                    bypassed: false,
                    unmet: [],
                    notice: '',
                  },
                ]
              : [],
          }),
      },
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

  it('releases an unsubmitted route only for the current draft and version', async () => {
    const author = await user(),
      other = await user();
    const input = content('discard-' + randomUUID());
    const { pageId, draftId } = await service.createDraft({
      actorId: author,
      ...input,
    });
    await service.saveDraft({
      actorId: author,
      pageId,
      expectedVersion: 1,
      ...input,
    });
    for (const [actor, id, version] of [
      [other, draftId, 2],
      [author, draftId, 1],
      [author, randomUUID(), 2],
    ] as const) {
      await expect(
        service.discardDraft(actor, pageId, id, version),
      ).rejects.toMatchObject({ code: 'DRAFT_CONFLICT' });
    }
    expect(await service.ownDraft(author, pageId)).toMatchObject({
      id: draftId,
      version: 2,
    });
    expect(
      await service.discardDraft(author, pageId, draftId, 2),
    ).toMatchObject({ routeReleased: true });
    const replacement = await service.createDraft({ actorId: other, ...input });
    expect(replacement.pageId).not.toBe(pageId);
  });

  it('keeps the route and first submitted revision when a returned draft is discarded', async () => {
    const author = await user(),
      guardian = await user(true);
    const input = content('reviewed-discard-' + randomUUID());
    const { pageId, draftId } = await service.createDraft({
      actorId: author,
      ...input,
    });
    const { revisionId } = await service.submitDraft({
      actorId: author,
      pageId,
      expectedVersion: 1,
      editSummary: 'Review',
      correlationId: randomUUID(),
    });
    await service.requestChanges({
      actorId: guardian,
      pageId,
      revisionId,
      reason: 'More context',
      correlationId: randomUUID(),
    });
    const returned = await service.ownDraft(author, pageId);
    expect(returned).toMatchObject({ version: 1 });
    await expect(
      service.discardDraft(author, pageId, draftId, 1),
    ).rejects.toMatchObject({ code: 'DRAFT_CONFLICT' });
    expect(
      await service.discardDraft(author, pageId, returned!.id, 1),
    ).toMatchObject({ routeReleased: false });
    expect(
      await fixture.prisma.researchRevision.findUnique({
        where: { id: revisionId },
      }),
    ).toMatchObject({ pageId, state: 'CHANGES_REQUESTED' });
    await expect(
      service.createDraft({ actorId: guardian, ...input }),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
  });

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

  it('requires moderation and the current audience before changing who can read a page', async () => {
    const guardian = await user(true),
      moderator = await user(),
      outsider = await user();
    moderators.add(moderator);
    moderators.add(outsider);
    const { pageId } = await service.createDraft({
      actorId: guardian,
      ...content('aud-' + randomUUID()),
    });
    await service.selfPublishDraft({
      actorId: guardian,
      pageId,
      expectedVersion: 1,
      editSummary: 'Initial',
      correlationId: randomUUID(),
    });
    await expect(
      service.setAudience(guardian, pageId, 'MEMBERS', []),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      service.setAudience(moderator, pageId, 'GROUPS', []),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    memberships.set(moderator, ['group:editors']);
    expect(
      await service.setAudience(moderator, pageId, 'GROUPS', [
        'editors',
        'editors',
      ]),
    ).toEqual({ visibility: 'GROUPS', groupKeys: ['editors'] });
    await service.setAudience(moderator, pageId, 'GROUPS', ['editors']);
    await expect(
      service.setAudience(outsider, pageId, 'PUBLIC', []),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const audit = await fixture.prisma.auditRecord.findMany({
      where: { targetId: pageId, action: 'research_lab.audience_updated' },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      actorId: moderator,
      metadata: {
        previousVisibility: 'PUBLIC',
        visibility: 'GROUPS',
        groupKeys: ['editors'],
      },
    });
    await service.setAudience(moderator, pageId, 'MEMBERS', []);
    expect(
      await fixture.prisma.researchPageAudienceGroup.count({
        where: { pageId },
      }),
    ).toBe(0);
    await service.setAudience(outsider, pageId, 'PUBLIC', []);
  });

  it('checks current audience before reading, saving or submitting a private draft', async () => {
    const actorId = await user(true);
    const input = content('audience-' + randomUUID());
    const { pageId, draftId } = await service.createDraft({
      actorId,
      ...input,
    });
    await fixture.prisma.researchPage.update({
      where: { id: pageId },
      data: {
        visibility: 'GROUPS',
        audienceGroups: { create: { groupKey: 'lab' } },
      },
    });
    memberships.set(actorId, ['group:lab']);
    expect(await service.ownDraft(actorId, pageId)).toMatchObject({
      id: draftId,
    });
    memberships.set(actorId, ['role:lab', 'lab']);
    expect(await service.ownDraft(actorId, pageId)).toBeNull();
    await expect(
      service.saveDraft({ actorId, pageId, expectedVersion: 1, ...input }),
    ).rejects.toMatchObject({ code: 'DRAFT_CONFLICT' });
    await expect(
      service.submitDraft({
        actorId,
        pageId,
        expectedVersion: 1,
        editSummary: 'Review',
        policySnapshotHash: 'policy',
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(
      await fixture.prisma.researchDraft.findUniqueOrThrow({
        where: { id: draftId },
      }),
    ).toMatchObject({ version: 1 });
    expect(
      await fixture.prisma.researchRevision.count({ where: { pageId } }),
    ).toBe(0);
  });
  it.each(['submitDraft', 'selfPublishDraft'] as const)(
    '%s preserves an autosave committed after its draft read',
    async (operation) => {
      const actorId = await user(operation === 'selfPublishDraft');
      const { pageId, draftId } = await service.createDraft({
        actorId,
        ...content('race-' + randomUUID()),
      });
      let result: Promise<void> | undefined;
      await fixture.prisma.$transaction(async (tx) => {
        await tx.researchDraft.update({
          where: { id: draftId },
          data: { version: { increment: 1 }, title: 'Concurrent autosave' },
        });
        result = expect(
          service[operation]({
            actorId,
            pageId,
            expectedVersion: 1,
            editSummary: 'Submission',
            policySnapshotHash: 'policy-v1',
            correlationId: randomUUID(),
          }),
        ).rejects.toMatchObject({ code: 'DRAFT_CONFLICT' });
        // Release the autosave only once PostgreSQL confirms the conflicting write.
        const [blocker] = await tx.$queryRaw<
          { pid: number }[]
        >`SELECT pg_backend_pid() AS pid`;
        for (;;) {
          const [row] = await fixture.prisma.$queryRaw<{ waiting: boolean }[]>`
            SELECT EXISTS (SELECT 1 FROM pg_stat_activity
              WHERE ${blocker.pid}::int = ANY(pg_blocking_pids(pid))
              AND query ILIKE '%DELETE%research_drafts%') AS waiting`;
          if (row.waiting) break;
        }
      });
      await result;
      expect(await service.ownDraft(actorId, pageId)).toMatchObject({
        version: 2,
        title: 'Concurrent autosave',
      });
      expect(
        await fixture.prisma.researchRevision.count({ where: { pageId } }),
      ).toBe(0);
      expect(
        await fixture.prisma.researchReviewDecision.count({
          where: { pageId },
        }),
      ).toBe(0);
      expect(
        await fixture.prisma.researchPage.findUniqueOrThrow({
          where: { id: pageId },
        }),
      ).toMatchObject({ publishedRevisionId: null, publicationGeneration: 0 });
    },
  );

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

  it('uses the trusted edit groups of each page and rechecks them on save and submission', async () => {
    const guardian = await user(true);
    const editor = await user();
    const pages: { pageId: string; input: ReturnType<typeof content> }[] = [];
    for (const group of ['database-editors', 'design-editors']) {
      const input = content('trusted-' + randomUUID());
      const { pageId } = await service.createDraft({
        actorId: guardian,
        ...input,
      });
      await service.selfPublishDraft({
        actorId: guardian,
        pageId,
        expectedVersion: 1,
        editSummary: 'Initial',
        correlationId: randomUUID(),
      });
      await service.setTrustedEditors(guardian, pageId, [group]);
      pages.push({ pageId, input });
    }
    const [database, design] = pages;
    const policy = {
      protectionLevel: 'TRUSTED',
      trustedEditGroupKeys: ['database-editors'],
    };
    expect(await service.editPolicy(guardian, database.pageId)).toEqual(policy);
    await expect(
      service.editPolicy(editor, database.pageId),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      service.setEditProtection(editor, database.pageId, 'OPEN'),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await service.setEditProtection(guardian, database.pageId, 'LOCKED');
    await expect(
      service.startDraft(guardian, database.pageId),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    await service.setEditProtection(guardian, database.pageId, 'GUARDIAN_ONLY');
    await expect(
      service.startDraft(editor, database.pageId),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await service.setEditProtection(guardian, database.pageId, 'OPEN');
    await expect(
      service.startDraft(editor, database.pageId),
    ).resolves.toMatchObject({ version: 1 });
    expect(
      await service.setEditProtection(guardian, database.pageId, 'TRUSTED'),
    ).toEqual(policy);
    memberships.set(editor, ['group:database-editors']);
    await expect(
      service.setTrustedEditors(editor, design.pageId, ['database-editors']),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      service.startDraft(editor, design.pageId),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await service.startDraft(editor, database.pageId);
    const save = {
      actorId: editor,
      pageId: database.pageId,
      expectedVersion: 1,
      ...database.input,
    };
    const submit = {
      actorId: editor,
      pageId: database.pageId,
      expectedVersion: 2,
      editSummary: 'Proposed edit',
      correlationId: randomUUID(),
    };
    memberships.delete(editor);
    await expect(service.saveDraft(save)).rejects.toMatchObject({
      code: 'DRAFT_CONFLICT',
    });
    memberships.set(editor, ['group:database-editors']);
    await expect(service.saveDraft(save)).resolves.toMatchObject({
      version: 2,
    });
    await service.setTrustedEditors(guardian, database.pageId, []);
    await expect(service.submitDraft(submit)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await service.setTrustedEditors(guardian, database.pageId, [
      'database-editors',
    ]);
    await expect(service.submitDraft(submit)).resolves.toMatchObject({
      state: 'IN_REVIEW',
    });
  });

  it('records a change request while preserving the newer private draft', async () => {
    const guardian = await user(true);
    const author = await user();
    const input = content('review-' + randomUUID());
    const { pageId } = await service.createDraft({
      actorId: guardian,
      ...input,
    });
    await service.selfPublishDraft({
      actorId: guardian,
      pageId,
      expectedVersion: 1,
      editSummary: 'Initial',
      correlationId: randomUUID(),
    });
    await service.startDraft(author, pageId);
    const submitted = await service.submitDraft({
      actorId: author,
      pageId,
      expectedVersion: 1,
      editSummary: 'Proposal',
      correlationId: randomUUID(),
    });
    await service.startDraft(author, pageId);
    await service.saveDraft({
      actorId: author,
      pageId,
      expectedVersion: 1,
      ...input,
      title: 'Unsubmitted work',
    });
    const before = await service.ownDraft(author, pageId);
    expect(before).toMatchObject({ version: 2, title: 'Unsubmitted work' });
    const correlationId = randomUUID();
    await expect(
      service.requestChanges({
        actorId: guardian,
        pageId,
        revisionId: submitted.revisionId,
        reason: 'Add sources',
        correlationId,
      }),
    ).resolves.toMatchObject({ state: 'CHANGES_REQUESTED' });
    expect(await service.ownDraft(author, pageId)).toEqual(before);
    expect(
      await fixture.prisma.researchReviewDecision.count({
        where: {
          revisionId: submitted.revisionId,
          action: 'CHANGES_REQUESTED',
          auditCorrelationId: correlationId,
        },
      }),
    ).toBe(1);
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

  it('preserves the removal reason and published pointer when rollback follows a tombstone', async () => {
    const actorId = await user(true);
    const { pageId } = await service.createDraft({
      actorId,
      ...content('rollback-' + randomUUID()),
    });
    const command = {
      actorId,
      pageId,
      policySnapshotHash: 'policy-v1',
      correlationId: randomUUID(),
    };
    const { revisionId } = await service.selfPublishDraft({
      ...command,
      expectedVersion: 1,
      editSummary: 'Initial publication',
    });
    await expect(
      service.tombstone({
        ...command,
        expectedPublicationGeneration: 1,
        reason: 'Removed by reviewer',
      }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    const moderator = await user();
    moderators.add(moderator);
    await service.tombstone({
      ...command,
      actorId: moderator,
      expectedPublicationGeneration: 1,
      reason: 'Removed by reviewer',
    });
    const removed = await fixture.prisma.researchPage.findUniqueOrThrow({
      where: { id: pageId },
    });
    await expect(
      service.rollback({
        ...command,
        revisionId,
        expectedPublicationGeneration: removed.publicationGeneration,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    expect(
      await fixture.prisma.researchPage.findUniqueOrThrow({
        where: { id: pageId },
      }),
    ).toEqual(removed);
    expect(
      await fixture.prisma.auditRecord.findFirstOrThrow({
        where: { targetId: pageId, action: 'research_lab.page_tombstoned' },
      }),
    ).toMatchObject({
      actorId: moderator,
      reason: 'Removed by reviewer',
      correlationId: command.correlationId,
    });
    const event = await fixture.prisma.outboxEvent.findFirstOrThrow({
      where: {
        aggregateId: pageId,
        eventName: 'research-lab.page.tombstoned.v1',
      },
    });
    expect(event.payload).toEqual({ pageId, publicationGeneration: 1 });
    expect(removed).toMatchObject({
      state: 'TOMBSTONED',
      publishedRevisionId: revisionId,
      tombstonedById: moderator,
      tombstoneReason: 'Removed by reviewer',
    });
    expect(
      await fixture.prisma.researchRevision.count({ where: { pageId } }),
    ).toBe(1);
  });

  it('fails closed when Guardian authority is revoked before a read', async () => {
    const guardian = await user(true);
    guardians.delete(guardian);
    await expect(service.reviewQueue(guardian)).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    });
  });
  it('preserves direct aliases across slug changes and serializes competing claims', async () => {
    const actorId = await user(true);
    const first = 'first-' + randomUUID(),
      other = 'other-' + randomUUID(),
      shared = 'shared-' + randomUUID();
    const publish = async (slug: string) => {
      const { pageId } = await service.createDraft({
        actorId,
        ...content(slug),
      });
      await service.selfPublishDraft({
        actorId,
        pageId,
        expectedVersion: 1,
        editSummary: 'Initial',
        policySnapshotHash: 'policy',
        correlationId: randomUUID(),
      });
      return pageId;
    };
    const rename = async (pageId: string, slug: string) => {
      const draft = await service.startDraft(actorId, pageId);
      const saved = await service.saveDraft({
        actorId,
        pageId,
        expectedVersion: draft.version,
        ...content(slug),
      });
      return service.selfPublishDraft({
        actorId,
        pageId,
        expectedVersion: saved.version,
        editSummary: 'Rename',
        policySnapshotHash: 'policy',
        correlationId: randomUUID(),
      });
    };
    const ids = await Promise.all([publish(first), publish(other)]);
    const result = await Promise.allSettled(
      ids.map((id) => rename(id, shared)),
    );
    expect(result.filter((row) => row.status === 'fulfilled')).toHaveLength(1);
    expect(result.find((row) => row.status === 'rejected')).toMatchObject({
      reason: { code: 'REVISION_CONFLICT' },
    });
    const winner = result.findIndex((row) => row.status === 'fulfilled');
    const original = [first, other][winner],
      pageId = ids[winner];
    expect(
      await fixture.prisma.researchSlugAlias.findUniqueOrThrow({
        where: { language_slug: { language: 'uk', slug: original } },
      }),
    ).toMatchObject({ pageId });
    await expect(
      service.createDraft({ actorId, ...content(original) }),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    await rename(pageId, original);
    expect(
      await fixture.prisma.researchSlugAlias.findMany({
        where: { pageId },
        select: { slug: true },
      }),
    ).toEqual([{ slug: shared }]);
    expect(
      await fixture.prisma.researchPage.findUniqueOrThrow({
        where: { id: pageId },
      }),
    ).toMatchObject({ slug: original, publicationGeneration: 3 });
  });
  it('rechecks block access on a previously created draft and preserves its contents after denial', async () => {
    const actorId = await user(true);
    const input = content('gated-' + randomUUID());
    const { pageId, draftId } = await service.createDraft({
      actorId,
      ...input,
    });
    deniedDocuments.add(actorId);
    await expect(service.ownDraft(actorId, pageId)).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    });
    await expect(
      service.saveDraft({ actorId, pageId, expectedVersion: 1, ...input }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      service.selfPublishDraft({
        actorId,
        pageId,
        expectedVersion: 1,
        editSummary: 'Publish',
        policySnapshotHash: 'policy',
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    expect(
      await fixture.prisma.researchDraft.findUniqueOrThrow({
        where: { id: draftId },
      }),
    ).toMatchObject({ document, version: 1 });
    expect(
      await fixture.prisma.researchRevision.count({ where: { pageId } }),
    ).toBe(0);
  });
  it('repairs stale derived fields from the published source before opening an editable draft', async () => {
    const actorId = await user(true);
    const { pageId } = await service.createDraft({
      actorId,
      ...content('repair-' + randomUUID()),
    });
    const { revisionId } = await service.selfPublishDraft({
      actorId,
      pageId,
      expectedVersion: 1,
      editSummary: 'Initial',
      policySnapshotHash: 'policy',
      correlationId: randomUUID(),
    });
    const before = await fixture.prisma.researchRevision.findUniqueOrThrow({
      where: { id: revisionId },
    });
    await fixture.prisma.researchRevision.update({
      where: { id: revisionId },
      data: { plainText: 'stale', searchText: 'stale' },
    });
    for (const contributor of [await user(), await user()]) {
      const { draftId } = await service.startDraft(contributor, pageId);
      expect(
        await fixture.prisma.researchDraft.findUniqueOrThrow({
          where: { id: draftId },
        }),
      ).toMatchObject({
        plainText: before.plainText,
        searchText: before.searchText,
        basePublishedRevisionId: revisionId,
      });
      expect(
        await fixture.prisma.researchRevision.findUniqueOrThrow({
          where: { id: revisionId },
        }),
      ).toEqual(before);
    }
    await fixture.prisma.researchRevision.update({
      where: { id: revisionId },
      data: { contentHash: '0'.repeat(64) },
    });
    await expect(
      service.startDraft(await user(), pageId),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
  });
});
