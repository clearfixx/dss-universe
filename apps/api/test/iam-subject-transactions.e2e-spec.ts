/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Transaction E2E
 * 📄 File: apps/api/test/iam-subject-transactions.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Proves root-bound Auth reads, existing evidence boundaries and group lock-wait behavior.
 *
 * 🧠 Responsibilities:
 * • verifies actual post-read Auth failures roll back IAM writes;
 * • observes a real blocked grant then disables the group before subject lookup.
 *
 * 🏗️ Architecture:
 * Actual AppModule in a fully migrated owned schema; synthetic fixtures are not login evidence.
 *
 * ⚠️ Important:
 * Real IAM safety rule; no authorization success mock, timeout increase or disabled history protection.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@api/core/database';
import { PrismaTransactionalSubjectExistenceReader } from '@api/modules/auth/infrastructure';
import type { RoleRevocationCheck } from '@api/modules/iam';
import { AppModule } from '../src/app.module';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import {
  IAM_ACCESS_GROUP_REPOSITORY,
  type AccessGroupRepository,
} from '../src/modules/iam/access-groups/contracts/access-group.repository.interface';
import {
  IAM_ROLE_REVOCATION_REPOSITORY,
  type RoleRevocationRepository,
} from '../src/modules/iam/user-access/contracts/role-revocation.repository.interface';
import { IamSafetyService } from '../src/modules/iam/safety/iam-safety.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('IAM subject transactions (e2e)', () => {
  let app: INestApplication;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let groups: AccessGroupRepository;
  let roles: RoleRevocationRepository;
  let subjects: PrismaTransactionalSubjectExistenceReader;
  let safety: IamSafetyService;
  let actor: string;
  let subject: string;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    prisma = fixture.prisma;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: () => Promise.resolve('') })
      .compile();
    app = module.createNestApplication();
    await app.init();
    groups = app.get(IAM_ACCESS_GROUP_REPOSITORY);
    roles = app.get(IAM_ROLE_REVOCATION_REPOSITORY);
    subjects = app.get(PrismaTransactionalSubjectExistenceReader);
    safety = app.get(IamSafetyService);
    actor = randomUUID();
    subject = randomUUID();
    await prisma.user.createMany({
      data: [actor, subject].map((id, index) => ({
        id,
        email: `${id}@dss.test`,
        username: `subject${index}`,
        passwordHash: 'synthetic-not-a-login-credential',
        status: 'ACTIVE',
      })),
    });
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });
  async function group() {
    const key = `boundary-${randomUUID()}`;
    return prisma.accessGroup.create({
      data: { key, displayName: key, kind: 'CUSTOM', createdById: actor },
    });
  }
  async function role() {
    const name = `boundary-${randomUUID()}`;
    const record = await prisma.role.create({ data: { name, label: name } });
    await prisma.userRole.create({
      data: { userId: subject, roleId: record.id },
    });
    return record;
  }
  const check: RoleRevocationCheck = (state) => {
    safety.assertLastAdminRoleIsNotRemoved(state);
    return undefined;
  };
  async function snapshot() {
    return {
      roles: await prisma.userRole.count(),
      memberships: await prisma.accessGroupMembership.count(),
      audit: await prisma.auditRecord.count(),
      outbox: await prisma.outboxEvent.count(),
    };
  }
  it('grants membership after the bound Auth ID read with exact audit and no outbox', async () => {
    const target = await group(),
      read = jest.spyOn(subjects, 'exists'),
      before = await snapshot();
    const input = {
      groupId: target.id,
      subjectId: subject,
      validFrom: new Date(0),
      validUntil: new Date(1000),
    };
    const result = await groups.grant(input, actor);
    expect(result).not.toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
    expect(read.mock.calls[0][0]).not.toBe(prisma);
    expect(read.mock.calls[0][1]).toBe(subject);
    const evidence = await prisma.auditRecord.findFirstOrThrow({
      where: { targetId: result!.id, action: 'iam.access-membership.granted' },
    });
    expect(evidence).toMatchObject({
      actorType: 'USER',
      actorId: actor,
      targetType: 'AccessGroupMembership',
      metadata: {
        subjectId: subject,
        groupId: target.id,
        validFrom: input.validFrom.toISOString(),
        validUntil: input.validUntil.toISOString(),
      },
    });
    expect(await snapshot()).toEqual({
      ...before,
      memberships: before.memberships + 1,
      audit: before.audit + 1,
    });
  });
  it('revokes an ordinary role after bound Auth read without adding audit/outbox', async () => {
    const target = await role(),
      read = jest.spyOn(subjects, 'exists'),
      before = await snapshot();
    expect(await roles.revoke(subject, target.id, check)).toBe('revoked');
    expect(read).toHaveBeenCalledTimes(1);
    expect(read.mock.calls[0][0]).not.toBe(prisma);
    expect(read.mock.calls[0][1]).toBe(subject);
    expect(await snapshot()).toEqual({ ...before, roles: before.roles - 1 });
  });
  it.each(['membership', 'role'] as const)(
    'rolls back %s when Auth rejects after a genuine ID read',
    async (kind) => {
      const target = kind === 'membership' ? await group() : await role(),
        before = await snapshot();
      const error = new Error('Synthetic post-subject-read failure');
      const exists = subjects.exists.bind(
        subjects,
      ) as PrismaTransactionalSubjectExistenceReader['exists'];
      jest.spyOn(subjects, 'exists').mockImplementationOnce(async (...args) => {
        await exists(...args);
        throw error;
      });
      fixture.queries.length = 0;
      const result =
        kind === 'membership'
          ? groups.grant(
              {
                groupId: target.id,
                subjectId: subject,
                validFrom: new Date(0),
                validUntil: null,
              },
              actor,
            )
          : roles.revoke(subject, target.id, check);
      await expect(result).rejects.toBe(error);
      expect(
        fixture.queries.some((query) =>
          query.includes(`FROM "${fixture.schema}"."users"`),
        ),
      ).toBe(true);
      expect(fixture.queries).toContain('ROLLBACK');
      expect(
        fixture.queries.some((query) => /^(INSERT|DELETE)\b/.test(query)),
      ).toBe(false);
      expect(await snapshot()).toEqual(before);
    },
  );
  it('rechecks enabled group after an observed lock wait, before any Auth lookup', async () => {
    const target = await group(),
      before = await snapshot(),
      read = jest.spyOn(subjects, 'exists');
    let release!: () => void;
    let ready!: (pid: number) => void;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const acquired = new Promise<number>((resolve) => {
      ready = resolve;
    });
    const holder = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM access_groups WHERE id = ${target.id} FOR UPDATE`;
      await tx.accessGroup.update({
        where: { id: target.id },
        data: { enabled: false },
      });
      const [row] = await tx.$queryRaw<
        { pid: number }[]
      >`SELECT pg_backend_pid() AS pid`;
      ready(row.pid);
      await released;
    });
    const holderPid = await acquired;
    const pending = Promise.allSettled([
      groups.grant(
        {
          groupId: target.id,
          subjectId: subject,
          validFrom: new Date(0),
          validUntil: null,
        },
        actor,
      ),
    ]);
    let barrierError: Error | undefined;
    try {
      const deadline = Date.now() + 2000;
      let blocked = 0;
      do {
        const [row] = await prisma.$queryRaw<
          { count: number }[]
        >`SELECT count(*)::int AS count FROM pg_stat_activity WHERE ${holderPid} = ANY(pg_blocking_pids(pid))`;
        blocked = row.count;
        if (blocked === 1) break;
      } while (Date.now() < deadline);
      expect(blocked).toBe(1);
      expect(read).not.toHaveBeenCalled();
    } catch (error) {
      barrierError =
        error instanceof Error
          ? error
          : new Error('Lock barrier failed', { cause: error });
    } finally {
      release();
      await holder;
    }
    const [outcome] = await pending;
    if (barrierError) throw barrierError;
    if (outcome.status === 'rejected') throw outcome.reason;
    expect(outcome.value).toBeNull();
    expect(read).not.toHaveBeenCalled();
    expect(await snapshot()).toEqual(before);
    expect(
      (await prisma.accessGroup.findUniqueOrThrow({ where: { id: target.id } }))
        .enabled,
    ).toBe(false);
  });
});
