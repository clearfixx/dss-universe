/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/test/moderation-sanctions.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies the M-0 sanctions journal against fully migrated PostgreSQL.
 *
 * ⚠️ Important:
 * Uses an isolated schema in the disposable dss_test database only.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { Permission } from '@api/core/authorization';
import { OutboxWriterService } from '@api/core/events';
import { ModerationSanctionError } from '@api/modules/moderation/domain/errors/moderation-sanction.error';
import { ModerationSanctionsService } from '@api/modules/moderation/infrastructure/prisma-moderation-sanctions';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Moderation sanctions core (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let service: ModerationSanctionsService;
  const subjectPermissions = new Map<string, string[]>();
  const moderatorPermissions = [
    Permission.ModerationSanctionsView,
    Permission.ModerationWarningsIssue,
    Permission.ModerationReadOnlyIssue,
    Permission.ModerationSanctionsRevoke,
  ] as string[];
  const adminPermissions = [
    ...moderatorPermissions,
    Permission.ModerationSanctionsStaff,
    Permission.ModerationPolicyManage,
  ] as string[];

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    service = new ModerationSanctionsService(
      fixture.prisma,
      new AuditWriterService(new AuditRedactionService()),
      new OutboxWriterService(),
      {
        getAccessProfileByUserId: (id) =>
          Promise.resolve({
            roles: [],
            permissions: subjectPermissions.get(id) ?? [],
          }),
      },
    );
  }, 60000);

  afterAll(async () => {
    await fixture?.close();
  });

  async function user(permissions: string[] = []): Promise<string> {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `moderation-${id}@dss.test`,
        username: `moderation-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    subjectPermissions.set(id, permissions);
    return id;
  }

  const actor = (id: string, permissions = moderatorPermissions) => ({
    id,
    permissions,
  });

  const warning = (subjectId: string, reason = 'Flood in topic') => ({
    subjectId,
    reason,
    context: { type: 'forum.post', id: randomUUID(), path: '/community/t/1' },
  });

  it('seeds the default policy and the moderation permissions', async () => {
    await expect(service.policy()).resolves.toEqual({
      warningLifetimeDays: 30,
      escalationWarningCount: 3,
      escalationReadOnlyDays: 7,
      readOnlyMaxDays: 365,
    });
    const keys = await fixture.prisma.permission.findMany({
      where: { key: { startsWith: 'moderation.' } },
      select: { key: true },
      orderBy: { key: 'asc' },
    });
    expect(keys.map(({ key }) => key)).toEqual([
      'moderation.policy.manage',
      'moderation.read-only.issue',
      'moderation.sanctions.revoke',
      'moderation.sanctions.staff',
      'moderation.sanctions.view',
      'moderation.warnings.issue',
    ]);
  });

  it('issues a 30-day warning with audit and Outbox evidence', async () => {
    const moderator = await user(moderatorPermissions);
    const subject = await user();
    const before = Date.now();
    const receipt = await service.issueWarning(
      actor(moderator),
      warning(subject),
    );
    expect(receipt.escalatedSanctionId).toBeNull();
    const row = await fixture.prisma.moderationSanction.findUniqueOrThrow({
      where: { id: receipt.sanctionId },
    });
    expect(row).toMatchObject({
      subjectId: subject,
      issuerId: moderator,
      kind: 'WARNING',
      origin: 'MANUAL',
      contextType: 'forum.post',
    });
    const lifetime = row.expiresAt.getTime() - row.issuedAt.getTime();
    expect(lifetime).toBe(30 * 86_400_000);
    expect(row.issuedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    await expect(
      fixture.prisma.auditRecord.count({
        where: { action: 'moderation.sanction_issued', targetId: subject },
      }),
    ).resolves.toBe(1);
    await expect(
      fixture.prisma.outboxEvent.count({
        where: {
          eventName: 'moderation.sanction.issued.v1',
          aggregateId: row.id,
        },
      }),
    ).resolves.toBe(1);
    await expect(service.status(subject)).resolves.toEqual({
      readOnlyUntil: null,
      activeWarnings: 1,
    });
  });

  it('escalates the third active warning into a 7-day read-only and consumes the warnings', async () => {
    const moderator = await user(moderatorPermissions);
    const subject = await user();
    await service.issueWarning(
      actor(moderator),
      warning(subject, 'First warning'),
    );
    await service.issueWarning(
      actor(moderator),
      warning(subject, 'Second warning'),
    );
    const third = await service.issueWarning(
      actor(moderator),
      warning(subject, 'Third warning'),
    );
    expect(third.escalatedSanctionId).not.toBeNull();
    const readOnly = await fixture.prisma.moderationSanction.findUniqueOrThrow({
      where: { id: third.escalatedSanctionId! },
    });
    expect(readOnly).toMatchObject({
      kind: 'READ_ONLY',
      origin: 'ESCALATION',
      issuerId: null,
    });
    expect(readOnly.expiresAt.getTime() - readOnly.issuedAt.getTime()).toBe(
      7 * 86_400_000,
    );
    const consumed = await fixture.prisma.moderationSanction.count({
      where: { subjectId: subject, consumedBySanctionId: readOnly.id },
    });
    expect(consumed).toBe(3);
    const status = await service.status(subject);
    expect(status.activeWarnings).toBe(0);
    expect(status.readOnlyUntil).toEqual(readOnly.expiresAt);

    const fourth = await service.issueWarning(
      actor(moderator),
      warning(subject, 'Fourth warning'),
    );
    expect(fourth.escalatedSanctionId).toBeNull();
  });

  it('serializes concurrent warnings so exactly one escalation happens', async () => {
    const moderator = await user(moderatorPermissions);
    const subject = await user();
    const receipts = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        service.issueWarning(
          actor(moderator),
          warning(subject, `Warning ${index}`),
        ),
      ),
    );
    expect(receipts.filter((r) => r.escalatedSanctionId).length).toBe(2);
    const escalations = await fixture.prisma.moderationSanction.count({
      where: { subjectId: subject, origin: 'ESCALATION' },
    });
    expect(escalations).toBe(2);
    const unconsumed = await fixture.prisma.moderationSanction.count({
      where: { subjectId: subject, kind: 'WARNING', consumedAt: null },
    });
    expect(unconsumed).toBe(0);
  });

  it('ignores revoked warnings when counting toward escalation', async () => {
    const moderator = await user(moderatorPermissions);
    const subject = await user();
    const first = await service.issueWarning(
      actor(moderator),
      warning(subject),
    );
    await service.revoke(actor(moderator), {
      sanctionId: first.sanctionId,
      reason: 'Issued by mistake',
    });
    await service.issueWarning(actor(moderator), warning(subject));
    const third = await service.issueWarning(
      actor(moderator),
      warning(subject),
    );
    expect(third.escalatedSanctionId).toBeNull();
  });

  it('issues and revokes a manual read-only within policy bounds', async () => {
    const moderator = await user(moderatorPermissions);
    const subject = await user();
    const expiresAt = new Date(Date.now() + 3 * 86_400_000);
    const receipt = await service.issueReadOnly(actor(moderator), {
      ...warning(subject),
      expiresAt,
    });
    await expect(service.readOnlyUntil(subject, new Date())).resolves.toEqual(
      expiresAt,
    );
    await expect(
      service.issueReadOnly(actor(moderator), {
        ...warning(subject),
        expiresAt: new Date(Date.now() + 400 * 86_400_000),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });

    const revoked = await service.revoke(actor(moderator), {
      sanctionId: receipt.sanctionId,
      reason: 'Appeal accepted informally',
    });
    expect(revoked.revokedById).toBe(moderator);
    await expect(
      service.readOnlyUntil(subject, new Date()),
    ).resolves.toBeNull();
    await expect(
      service.revoke(actor(moderator), {
        sanctionId: receipt.sanctionId,
        reason: 'Second revocation',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    await expect(
      fixture.prisma.outboxEvent.count({
        where: {
          eventName: 'moderation.sanction.revoked.v1',
          aggregateId: receipt.sanctionId,
        },
      }),
    ).resolves.toBe(1);
  });

  it('rejects self-sanctions, missing permissions and unprotected staff targets', async () => {
    const moderator = await user(moderatorPermissions);
    const otherModerator = await user(moderatorPermissions);
    const admin = await user(adminPermissions);
    const member = await user();

    await expect(
      service.issueWarning(actor(moderator), warning(moderator)),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      service.issueWarning(actor(member, []), warning(moderator)),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      service.issueWarning(actor(moderator), warning(otherModerator)),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      service.issueWarning(
        actor(admin, adminPermissions),
        warning(otherModerator),
      ),
    ).resolves.toMatchObject({ escalatedSanctionId: null });
  });

  it('issues scoped warnings through the owner contract without global permissions', async () => {
    const curator = await user();
    const subject = await user();
    const receipt = await service.issueScoped({
      actorId: curator,
      subjectId: subject,
      kind: 'WARNING',
      reason: 'Off-topic in curated topic',
      context: { type: 'forum.topic', id: randomUUID() },
    });
    await expect(
      fixture.prisma.moderationSanction.findUniqueOrThrow({
        where: { id: receipt.sanctionId },
      }),
    ).resolves.toMatchObject({ origin: 'SCOPED', issuerId: curator });
    await expect(
      service.issueScoped({
        actorId: curator,
        subjectId: subject,
        kind: 'WARNING',
        reason: 'Missing context',
        context: { type: '', id: '' },
      }),
    ).rejects.toBeInstanceOf(ModerationSanctionError);
  });

  it('returns a paginated private journal newest first', async () => {
    const moderator = await user(moderatorPermissions);
    const subject = await user();
    await service.issueWarning(actor(moderator), warning(subject, 'Older'));
    await service.issueWarning(actor(moderator), warning(subject, 'Newer'));
    const journal = await service.journal(subject, 1, 1);
    expect(journal).toMatchObject({ total: 2, page: 1, limit: 1 });
    expect(journal.items[0].reason).toBe('Newer');
    await expect(
      service.journalForStaff(actor(subject, []), moderator, 1, 20),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  });

  it('updates policy within bounds and applies it to new warnings', async () => {
    const admin = await user(adminPermissions);
    const moderator = await user(moderatorPermissions);
    const subject = await user();
    await expect(
      service.updatePolicy(actor(admin, adminPermissions), {
        warningLifetimeDays: 10,
        escalationWarningCount: 2,
        escalationReadOnlyDays: 3,
        readOnlyMaxDays: 90,
      }),
    ).resolves.toMatchObject({ escalationWarningCount: 2 });
    try {
      await service.issueWarning(actor(moderator), warning(subject));
      const second = await service.issueWarning(
        actor(moderator),
        warning(subject),
      );
      expect(second.escalatedSanctionId).not.toBeNull();
      await expect(
        service.updatePolicy(actor(moderator), {
          warningLifetimeDays: 10,
          escalationWarningCount: 2,
          escalationReadOnlyDays: 3,
          readOnlyMaxDays: 90,
        }),
      ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
      await expect(
        service.updatePolicy(actor(admin, adminPermissions), {
          warningLifetimeDays: 0,
          escalationWarningCount: 2,
          escalationReadOnlyDays: 3,
          readOnlyMaxDays: 90,
        }),
      ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    } finally {
      await service.updatePolicy(actor(admin, adminPermissions), {
        warningLifetimeDays: 30,
        escalationWarningCount: 3,
        escalationReadOnlyDays: 7,
        readOnlyMaxDays: 365,
      });
    }
  });

  it('enforces journal invariants in the database', async () => {
    const moderator = await user(moderatorPermissions);
    const subject = await user();
    const { sanctionId } = await service.issueWarning(
      actor(moderator),
      warning(subject),
    );
    await expect(
      fixture.prisma.moderationSanction.delete({ where: { id: sanctionId } }),
    ).rejects.toThrow();
    await expect(
      fixture.prisma.moderationSanction.update({
        where: { id: sanctionId },
        data: { reason: 'Rewritten history' },
      }),
    ).rejects.toThrow();
    await expect(
      fixture.prisma.moderationSanction.create({
        data: {
          subjectId: subject,
          kind: 'WARNING',
          origin: 'ESCALATION',
          reason: 'Invalid escalation warning',
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      }),
    ).rejects.toThrow();
    await expect(
      fixture.prisma.moderationSanction.create({
        data: {
          subjectId: subject,
          issuerId: subject,
          kind: 'WARNING',
          origin: 'MANUAL',
          reason: 'Self issued',
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      }),
    ).rejects.toThrow();
    await expect(
      fixture.prisma.moderationSanctionPolicy.create({
        data: { id: 'second' },
      }),
    ).rejects.toThrow();
  });

  it('lists the staff journal across members with filters (B09)', async () => {
    const moderator = await user(moderatorPermissions);
    const first = await user();
    const second = await user();
    const kept = await service.issueWarning(actor(moderator), warning(first));
    const revoked = await service.issueWarning(
      actor(moderator),
      warning(second, 'Spam links'),
    );
    await service.revoke(actor(moderator), {
      sanctionId: revoked.sanctionId,
      reason: 'Issued by mistake',
    });
    const readOnly = await service.issueReadOnly(actor(moderator), {
      ...warning(second, 'Repeated spam'),
      expiresAt: new Date(Date.now() + 3 * 86_400_000),
    });

    const all = await service.listForStaff(
      actor(moderator),
      { subjectId: null, kind: null, activeOnly: false },
      1,
      50,
    );
    const ids = all.items.map(({ id }) => id);
    expect(ids).toEqual(
      expect.arrayContaining([
        kept.sanctionId,
        revoked.sanctionId,
        readOnly.sanctionId,
      ]),
    );
    expect(ids.indexOf(readOnly.sanctionId)).toBeLessThan(
      ids.indexOf(kept.sanctionId),
    );

    const ofSecond = await service.listForStaff(
      actor(moderator),
      { subjectId: second, kind: null, activeOnly: true },
      1,
      50,
    );
    expect(ofSecond.items.map(({ id }) => id)).toEqual([readOnly.sanctionId]);

    const readOnlyOnly = await service.listForStaff(
      actor(moderator),
      { subjectId: null, kind: 'READ_ONLY', activeOnly: false },
      1,
      50,
    );
    expect(readOnlyOnly.items.every(({ kind }) => kind === 'READ_ONLY')).toBe(
      true,
    );

    const member = await user();
    await expect(
      service.listForStaff(
        actor(member, []),
        { subjectId: null, kind: null, activeOnly: false },
        1,
        20,
      ),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  });
});
