/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/test/moderation-community-rules.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Community rules catalogue against a migrated database: permission,
 * numeric ordering, unique numbers, deactivation and audit.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { Permission } from '@api/core/authorization';
import { CommunityRulesService } from '@api/modules/moderation/infrastructure/prisma-community-rules';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Community rules (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let rules: CommunityRulesService;

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    rules = new CommunityRulesService(
      fixture.prisma,
      new AuditWriterService(new AuditRedactionService()),
    );
  }, 60000);

  afterAll(async () => {
    await fixture?.close();
  });

  async function admin() {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `rules-${id}@dss.test`,
        username: `rules-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    return {
      id,
      permissions: [Permission.ModerationRulesManage] as string[],
    };
  }

  it('keeps numbered rules for administrators only, audited', async () => {
    const actor = await admin();
    await expect(
      rules.list({ id: actor.id, permissions: [] }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });

    const ten = await rules.create(actor, {
      code: '2.10',
      text: 'No advertising.',
      active: true,
    });
    await rules.create(actor, {
      code: '2.2.',
      text: 'No insults.',
      active: true,
    });
    expect((await rules.list(actor)).map(({ code }) => code)).toEqual([
      '2.2',
      '2.10',
    ]);

    await expect(
      rules.create(actor, { code: '2.2', text: 'Duplicate.', active: true }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
    await expect(
      rules.update(actor, randomUUID(), {
        code: '9',
        text: 'Missing.',
        active: true,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    await expect(
      rules.update(actor, ten.id, {
        code: '2.10',
        text: 'No advertising at all.',
        active: false,
      }),
    ).resolves.toMatchObject({ active: false });

    const audit = await fixture.prisma.auditRecord.findMany({
      where: { targetType: 'CommunityRule', targetId: ten.id },
      orderBy: { occurredAt: 'asc' },
    });
    expect(audit.map(({ action }) => action)).toEqual([
      'moderation.rule_created',
      'moderation.rule_updated',
    ]);
  });
});
