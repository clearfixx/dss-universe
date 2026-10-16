/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Transaction Tests
 * 📄 File: apps/api/src/composition/iam-transactions/infrastructure/iam-subject-transactions.spec.ts
 *
 * 🎯 Purpose:
 * Pins owner stage order, failures and same-client Auth/IAM transaction composition.
 *
 * 🧠 Responsibilities:
 * • verifies group-first and subject-first semantics remain distinct;
 * • verifies role policy facts, default versus Read Committed lifetime and ID-only reads.
 *
 * 🏗️ Architecture:
 * Pure adapter tests; real PostgreSQL suites separately prove locks and rollback.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PrismaService, TransactionClient } from '@api/core/database';
import type { AuditWriterService } from '@api/core/audit';
import type { RoleRevocationCheck } from '@api/modules/iam';
import {
  PrismaMembershipGrantWriter,
  PrismaRoleRevocationWriter,
} from '@api/modules/iam/infrastructure';
import { PrismaTransactionalSubjectExistenceReader } from '@api/modules/auth/infrastructure';
import { PrismaMembershipGrantTransaction } from './prisma-membership-grant.transaction';
import { PrismaRoleRevocationTransaction } from './prisma-role-revocation.transaction';
import { PrismaRoleRevocationRepository } from '../../../modules/iam/infrastructure/repositories/prisma-role-revocation.repository';
import { PrismaAccessGroupRepository } from '../../../modules/iam/infrastructure/repositories/prisma-access-group.repository';

const input = {
  groupId: 'group',
  subjectId: 'subject',
  validFrom: new Date(0),
  validUntil: null,
};
describe('Owned membership grant writer', () => {
  function harness() {
    const lock = jest.fn().mockResolvedValue([]);
    const group = jest.fn().mockResolvedValue({ enabled: true });
    const subject = jest.fn<Promise<boolean>, []>().mockResolvedValue(true);
    const record = { id: 'membership', ...input, grantedById: 'actor' };
    const create = jest.fn().mockResolvedValue(record);
    const audit = jest
      .fn<Promise<string>, Parameters<AuditWriterService['append']>>()
      .mockResolvedValue('audit');
    const tx = {
      $queryRaw: lock,
      accessGroup: { findUnique: group },
      accessGroupMembership: { create },
    } as unknown as TransactionClient;
    const writer = new PrismaMembershipGrantWriter({
      append: audit,
    } as unknown as AuditWriterService);
    const grant = () => writer.grant(tx, input, 'actor', subject);
    return { lock, group, subject, create, audit, tx, record, grant };
  }
  it('retains group lock/check before ID lookup, then membership and audit', async () => {
    const h = harness();
    expect(await h.grant()).toEqual(h.record);
    expect(h.lock).toHaveBeenCalledWith(expect.any(Array), 'group');
    expect(h.group).toHaveBeenCalledWith({
      where: { id: 'group' },
      select: { enabled: true },
    });
    expect(h.create).toHaveBeenCalledWith({
      data: { ...input, grantedById: 'actor' },
      select: {
        id: true,
        groupId: true,
        subjectId: true,
        validFrom: true,
        validUntil: true,
        grantedById: true,
        createdAt: true,
        revokedAt: true,
        revokedById: true,
        revokeReason: true,
      },
    });
    expect(h.audit).toHaveBeenCalledWith(h.tx, {
      action: 'iam.access-membership.granted',
      actorType: 'USER',
      actorId: 'actor',
      targetType: 'AccessGroupMembership',
      targetId: 'membership',
      metadata: {
        subjectId: 'subject',
        groupId: 'group',
        validFrom: new Date(0).toISOString(),
        validUntil: null,
      },
    });
    const order = [h.lock, h.group, h.subject, h.create, h.audit].map(
      (fn) => fn.mock.invocationCallOrder[0],
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it('retains the expiring membership audit timestamp', async () => {
    const h = harness();
    h.create.mockResolvedValue({ ...h.record, validUntil: new Date(1000) });
    await h.grant();
    expect(h.audit.mock.calls[0][1].metadata).toMatchObject({
      validUntil: new Date(1000).toISOString(),
    });
  });
  it.each([null, { enabled: false }])(
    'never reads subject for unavailable group %j',
    async (value) => {
      const h = harness();
      h.group.mockResolvedValue(value);
      expect(await h.grant()).toBeNull();
      for (const fn of [h.subject, h.create, h.audit])
        expect(fn).not.toHaveBeenCalled();
    },
  );
  it('returns null for missing subject without INSERT or audit', async () => {
    const h = harness();
    h.subject.mockResolvedValue(false);
    expect(await h.grant()).toBeNull();
    expect(h.create).not.toHaveBeenCalled();
    expect(h.audit).not.toHaveBeenCalled();
  });
  it.each(['lock', 'group', 'subject', 'create', 'audit'] as const)(
    'propagates %s failure without a fallback grant',
    async (stage) => {
      const h = harness(),
        error = new Error('Synthetic grant failure');
      h[stage].mockRejectedValueOnce(error);
      await expect(h.grant()).rejects.toBe(error);
      if (stage !== 'audit') expect(h.audit).not.toHaveBeenCalled();
    },
  );
});
describe('Owned role revocation writer', () => {
  function harness() {
    const subject = jest.fn<Promise<boolean>, []>().mockResolvedValue(true);
    const lock = jest.fn().mockResolvedValue([]),
      role = jest.fn().mockResolvedValue({ name: 'admin' }),
      assignment = jest.fn().mockResolvedValue({ userId: 'subject' }),
      count = jest.fn().mockResolvedValue(2),
      remove = jest.fn().mockResolvedValue({ userId: 'subject' });
    const policy = jest
      .fn<undefined, Parameters<RoleRevocationCheck>>()
      .mockReturnValue(undefined);
    const tx = {
      $queryRaw: lock,
      role: { findUnique: role },
      userRole: { findUnique: assignment, count, delete: remove },
    } as unknown as TransactionClient;
    const writer = new PrismaRoleRevocationWriter();
    return {
      subject,
      lock,
      role,
      assignment,
      count,
      remove,
      policy,
      tx,
      revoke: () => writer.revoke(tx, 'subject', 'role', subject, policy),
    };
  }
  it('preserves subject -> role lock -> role -> assignment -> count -> policy -> delete', async () => {
    const h = harness();
    expect(await h.revoke()).toBe('revoked');
    expect(h.lock).toHaveBeenCalledWith(expect.any(Array), 'role');
    expect(h.role).toHaveBeenCalledWith({
      where: { id: 'role' },
      select: { name: true },
    });
    const selector = {
      where: { userId_roleId: { userId: 'subject', roleId: 'role' } },
      select: { userId: true },
    };
    expect(h.assignment).toHaveBeenCalledWith(selector);
    expect(h.remove).toHaveBeenCalledWith(selector);
    expect(h.count).toHaveBeenCalledWith({ where: { roleId: 'role' } });
    expect(h.policy).toHaveBeenCalledWith({
      roleName: 'admin',
      adminsWithRoleCount: 2,
    });
    const order = [
      h.subject,
      h.lock,
      h.role,
      h.assignment,
      h.count,
      h.policy,
      h.remove,
    ].map((fn) => fn.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it.each(['subject', 'role', 'assignment'] as const)(
    'retains missing %s outcome without policy/delete',
    async (stage) => {
      const h = harness();
      if (stage === 'subject') h.subject.mockResolvedValue(false);
      else h[stage].mockResolvedValue(null);
      expect(await h.revoke()).toBe(`${stage}-not-found`);
      if (stage === 'subject') expect(h.lock).not.toHaveBeenCalled();
      expect(h.policy).not.toHaveBeenCalled();
      expect(h.remove).not.toHaveBeenCalled();
    },
  );
  it.each([
    'subject',
    'lock',
    'role',
    'assignment',
    'count',
    'policy',
    'remove',
  ] as const)(
    'propagates %s rejection; never deletes before acceptance',
    async (stage) => {
      const h = harness(),
        error = new Error('Synthetic role failure');
      if (stage === 'policy')
        h.policy.mockImplementationOnce(() => {
          throw error;
        });
      else h[stage].mockRejectedValueOnce(error);
      await expect(h.revoke()).rejects.toBe(error);
      if (stage !== 'remove') expect(h.remove).not.toHaveBeenCalled();
    },
  );
});
describe('Root subject transaction binding', () => {
  it.each(['membership', 'role'] as const)(
    'binds %s Auth read to the writer client with unchanged options',
    async (kind) => {
      const tx = {} as TransactionClient;
      const exists = jest.fn().mockResolvedValue(true),
        policy: RoleRevocationCheck = () => undefined;
      const transaction = jest.fn<
        Promise<unknown>,
        [(client: TransactionClient) => Promise<unknown>, unknown?]
      >(async (operation) => operation(tx));
      const prisma = { $transaction: transaction } as unknown as PrismaService;
      const reader = {
        exists,
      } as unknown as PrismaTransactionalSubjectExistenceReader;
      if (kind === 'membership') {
        const grant = jest.fn(
          async (
            client: TransactionClient,
            command: unknown,
            actor: string,
            lookup: () => Promise<boolean>,
          ) => {
            expect(client).toBe(tx);
            expect(command).toBe(input);
            expect(actor).toBe('actor');
            expect(exists).not.toHaveBeenCalled();
            expect(await lookup()).toBe(true);
            return null;
          },
        );
        await new PrismaMembershipGrantTransaction(
          prisma,
          { grant } as unknown as PrismaMembershipGrantWriter,
          reader,
        ).grant(input, 'actor');
        expect(transaction.mock.calls[0]).toHaveLength(1);
      } else {
        const revoke = jest.fn(
          async (
            client: TransactionClient,
            subject: string,
            role: string,
            lookup: () => Promise<boolean>,
            check: RoleRevocationCheck,
          ) => {
            expect(client).toBe(tx);
            expect(subject).toBe('subject');
            expect(role).toBe('role');
            expect(check).toBe(policy);
            expect(exists).not.toHaveBeenCalled();
            expect(await lookup()).toBe(true);
            return 'revoked' as const;
          },
        );
        await new PrismaRoleRevocationTransaction(
          prisma,
          { revoke },
          reader,
        ).revoke('subject', 'role', policy);
        expect(transaction.mock.calls[0]).toHaveLength(2);
        expect(transaction.mock.calls[0][1]).toEqual({
          isolationLevel: 'ReadCommitted',
        });
      }
      expect(exists).toHaveBeenCalledWith(tx, 'subject');
      expect(transaction).toHaveBeenCalledTimes(1);
    },
  );
  it('reads only opaque ID, returns false when missing and propagates errors without cache', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: 'subject' });
    const tx = { user: { findUnique } } as unknown as TransactionClient;
    const reader = new PrismaTransactionalSubjectExistenceReader();
    expect(await reader.exists(tx, 'subject')).toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'subject' },
      select: { id: true },
    });
    findUnique.mockResolvedValueOnce(null);
    expect(await reader.exists(tx, 'subject')).toBe(false);
    const error = new Error('Synthetic Auth failure');
    findUnique.mockRejectedValueOnce(error);
    await expect(reader.exists(tx, 'subject')).rejects.toBe(error);
  });
  it('keeps both private repositories as semantic delegators', async () => {
    const grant = jest.fn().mockResolvedValue(null),
      revoke = jest.fn().mockResolvedValue('subject-not-found');
    const groups = new PrismaAccessGroupRepository(
      {} as PrismaService,
      {} as AuditWriterService,
      { grant },
    );
    const roles = new PrismaRoleRevocationRepository({ revoke });
    const policy: RoleRevocationCheck = () => undefined;
    expect(await groups.grant(input, 'actor')).toBeNull();
    expect(await roles.revoke('subject', 'role', policy)).toBe(
      'subject-not-found',
    );
    expect(grant).toHaveBeenCalledWith(input, 'actor');
    expect(revoke).toHaveBeenCalledWith('subject', 'role', policy);
  });
});
