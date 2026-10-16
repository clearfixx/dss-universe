/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization Read Composition
 * 📄 File: apps/api/src/composition/authorization-reads/infrastructure/authorization-reads.spec.ts
 *
 * 🎯 Purpose:
 * Pins exact owned selections, first-seen order, missing facts and failure propagation.
 *
 * 🏗️ Architecture:
 * Pure boundary tests; migrated E2E separately proves actual SQL and revocation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PrismaService } from '@api/core/database';
import { PermissionsRepository } from '@api/core/authorization';
import { PrismaRolePermissionKeysReader } from '@api/modules/iam/infrastructure/repositories/prisma-role-permission-keys.reader';
import { mapAuthorizationAssignmentFacts } from '@api/modules/iam/infrastructure';
import { PrismaAuthorizationSubjectReader } from './prisma-authorization-subject.reader';
import { IamRolePermissionFactsAdapter } from './iam-role-permission-facts.adapter';
const assignments = {
  roles: [
    {
      role: {
        name: 'z',
        permissions: [
          { permission: { key: 'z' } },
          { permission: { key: 'a' } },
        ],
      },
    },
    { role: { name: 'z', permissions: [{ permission: { key: 'z' } }] } },
    { role: { name: 'a', permissions: [] } },
  ],
  directPermissions: [
    { permission: { key: 'a' } },
    { permission: { key: 'direct' } },
  ],
};
const expected = { roles: ['z', 'a'], permissions: ['z', 'a', 'direct'] };
describe('Authorization assignment facts', () => {
  it('retains first-seen order, deduplication and an empty role', () => {
    expect(mapAuthorizationAssignmentFacts(assignments)).toEqual(expected);
    expect(mapAuthorizationAssignmentFacts(null)).toEqual({
      roles: [],
      permissions: [],
    });
    expect(
      mapAuthorizationAssignmentFacts({ roles: [], directPermissions: [] }),
    ).toEqual({ roles: [], permissions: [] });
  });
  it('root executes exactly the original nested selection without extra existence read or transaction', async () => {
    const findUnique = jest.fn().mockResolvedValue(assignments);
    const transaction = jest.fn();
    const reader = new PrismaAuthorizationSubjectReader({
      user: { findUnique },
      $transaction: transaction,
    } as unknown as PrismaService);
    expect(await reader.read('subject')).toEqual(expected);
    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'subject' },
      select: {
        roles: {
          select: {
            role: {
              select: {
                name: true,
                permissions: {
                  select: { permission: { select: { key: true } } },
                },
              },
            },
          },
        },
        directPermissions: {
          select: { permission: { select: { key: true } } },
        },
      },
    });
    expect(transaction).not.toHaveBeenCalled();
    findUnique.mockResolvedValue(null);
    expect(await reader.read('subject')).toEqual({
      roles: [],
      permissions: [],
    });
    const error = new Error('synthetic store failure');
    findUnique.mockRejectedValue(error);
    await expect(reader.read('subject')).rejects.toBe(error);
  });
  it('IAM retains empty-input short circuit, exact role query and first-seen key order', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([
        { permission: { key: 'z' } },
        { permission: { key: 'a' } },
        { permission: { key: 'z' } },
      ]);
    const reader = new PrismaRolePermissionKeysReader({
      rolePermission: { findMany },
    } as unknown as PrismaService);
    expect(await reader.read([])).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
    expect(await reader.read(['z', 'a'])).toEqual(['z', 'a']);
    expect(findMany).toHaveBeenCalledWith({
      where: { role: { name: { in: ['z', 'a'] } } },
      select: { permission: { select: { key: true } } },
    });
    findMany.mockResolvedValue([]);
    expect(await reader.read(['missing'])).toEqual([]);
    const error = new Error('synthetic role store failure');
    findMany.mockRejectedValue(error);
    await expect(reader.read(['z'])).rejects.toBe(error);
  });
  it('root role adapter forwards current evidence and errors without caching', async () => {
    const read = jest.fn().mockResolvedValue(['z', 'a']);
    const adapter = new IamRolePermissionFactsAdapter({ read });
    expect(await adapter.read(['role'])).toEqual(['z', 'a']);
    read.mockResolvedValue([]);
    expect(await adapter.read(['role'])).toEqual([]);
    expect(read.mock.calls).toEqual([[['role']], [['role']]]);
    const error = new Error('synthetic provider failure');
    read.mockRejectedValue(error);
    await expect(adapter.read(['role'])).rejects.toBe(error);
  });
  it('Core delegates both independent operations without persistence or fallbacks', async () => {
    const roleRead = jest.fn().mockResolvedValue(['key']);
    const subjectRead = jest.fn().mockResolvedValue(expected);
    const repository = new PermissionsRepository(
      { read: roleRead },
      { read: subjectRead },
    );
    expect(await repository.findPermissionKeysByRoleNames(['role'])).toEqual([
      'key',
    ]);
    expect(await repository.findAccessProfileByUserId('subject')).toEqual(
      expected,
    );
    expect(roleRead).toHaveBeenCalledWith(['role']);
    expect(subjectRead).toHaveBeenCalledWith('subject');
    const error = new Error('synthetic boundary unavailable');
    roleRead.mockRejectedValue(error);
    subjectRead.mockRejectedValue(error);
    await expect(
      repository.findPermissionKeysByRoleNames(['role']),
    ).rejects.toBe(error);
    await expect(repository.findAccessProfileByUserId('subject')).rejects.toBe(
      error,
    );
  });
});
