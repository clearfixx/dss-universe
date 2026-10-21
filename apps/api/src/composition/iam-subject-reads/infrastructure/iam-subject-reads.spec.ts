/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Subject Read Composition
 * 📄 File: apps/api/src/composition/iam-subject-reads/infrastructure/iam-subject-reads.spec.ts
 *
 * 🎯 Purpose:
 * Proves minimal subject evidence, owned selection, error propagation and independent read semantics.
 *
 * 🧠 Responsibilities:
 * • verifies nullable versus empty assignments and exact query shape;
 * • rejects profile/credential leakage and extra transaction or existence reads.
 *
 * 🏗️ Architecture:
 * Pure boundary tests; migrated E2E separately pins actual SQL work for every account state.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PrismaService } from '@api/core/database';
import { PrismaSubjectExistenceReader } from '@api/modules/auth/infrastructure/repositories/prisma-subject-existence.reader';
import { PrismaSubjectAccessRepository } from '@api/modules/iam/infrastructure/repositories/prisma-subject-access.repository';
import { AuthSubjectExistenceAdapter } from './auth-subject-existence.adapter';
import { PrismaIamAssignmentReader } from './prisma-iam-assignment.reader';

function harness() {
  const findUnique = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    user: { findUnique },
    $transaction: transaction,
  } as unknown as PrismaService;
  return { findUnique, transaction, prisma };
}
describe('Independent subject reads', () => {
  it.each([true, false])(
    'forwards authoritative existence %s without caching',
    async (value) => {
      const exists = jest.fn().mockResolvedValue(value);
      const reader = new AuthSubjectExistenceAdapter({ exists });
      expect(await reader.exists('subject')).toBe(value);
      expect(await reader.exists('subject')).toBe(value);
      expect(exists.mock.calls).toEqual([['subject'], ['subject']]);
    },
  );
  it.each([{ id: 'subject' }, null])(
    'selects only Auth ID and retains missing evidence %j',
    async (record) => {
      const h = harness();
      h.findUnique.mockResolvedValue(record);
      expect(
        await new PrismaSubjectExistenceReader(h.prisma).exists('subject'),
      ).toBe(record !== null);
      expect(h.findUnique).toHaveBeenCalledTimes(1);
      expect(h.findUnique).toHaveBeenCalledWith({
        where: { id: 'subject' },
        select: { id: true },
      });
      expect(h.transaction).not.toHaveBeenCalled();
    },
  );
  it('preserves the exact nested query and emits only assignment facts', async () => {
    const h = harness();
    h.findUnique.mockResolvedValue({
      id: 'subject',
      email: 'never-return',
      passwordHash: 'never-return',
      roles: [
        {
          role: {
            id: 'role',
            name: 'staff',
            permissions: [
              { permission: { key: 'z' } },
              { permission: { key: 'a' } },
            ],
          },
        },
      ],
      directPermissions: [{ permission: { id: 'permission', key: 'direct' } }],
    });
    expect(
      await new PrismaIamAssignmentReader(h.prisma).find('subject'),
    ).toEqual({
      subjectId: 'subject',
      roles: [{ id: 'role', name: 'staff', permissionKeys: ['z', 'a'] }],
      directPermissions: [{ id: 'permission', key: 'direct' }],
    });
    expect(h.findUnique).toHaveBeenCalledTimes(1);
    expect(h.findUnique).toHaveBeenCalledWith({
      where: { id: 'subject' },
      select: {
        id: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                permissions: {
                  select: { permission: { select: { key: true } } },
                },
              },
            },
          },
          orderBy: { assignedAt: 'asc' },
        },
        directPermissions: {
          select: { permission: { select: { id: true, key: true } } },
          orderBy: { assignedAt: 'asc' },
        },
      },
    });
    expect(h.transaction).not.toHaveBeenCalled();
  });
  it.each([null, { id: 'subject', roles: [], directPermissions: [] }])(
    'distinguishes absent anchor from empty assignments %j',
    async (record) => {
      const h = harness();
      h.findUnique.mockResolvedValue(record);
      expect(
        await new PrismaIamAssignmentReader(h.prisma).find('subject'),
      ).toEqual(
        record
          ? { subjectId: 'subject', roles: [], directPermissions: [] }
          : null,
      );
    },
  );
  it('propagates provider and storage failures without false/empty fallback', async () => {
    const error = new Error('synthetic unavailable');
    const h = harness();
    h.findUnique.mockRejectedValue(error);
    await expect(
      new PrismaSubjectExistenceReader(h.prisma).exists('subject'),
    ).rejects.toBe(error);
    await expect(
      new PrismaIamAssignmentReader(h.prisma).find('subject'),
    ).rejects.toBe(error);
    await expect(
      new AuthSubjectExistenceAdapter({
        exists: () => Promise.reject(error),
      }).exists('subject'),
    ).rejects.toBe(error);
  });
  it('IAM delegates independent reads without accessing its shared users table', async () => {
    const h = harness();
    const exists = jest.fn().mockResolvedValue(true);
    const find = jest.fn().mockResolvedValue(null);
    const repository = new PrismaSubjectAccessRepository(
      h.prisma,
      { exists },
      { find },
    );
    expect(await repository.subjectExists('subject')).toBe(true);
    expect(await repository.findAssignments('subject')).toBeNull();
    expect(exists).toHaveBeenCalledWith('subject');
    expect(find).toHaveBeenCalledWith('subject');
    expect(h.findUnique).not.toHaveBeenCalled();
  });
});
