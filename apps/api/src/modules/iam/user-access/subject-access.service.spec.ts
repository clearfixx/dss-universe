/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM User Access
 * 📄 File: apps/api/src/modules/iam/user-access/subject-access.service.spec.ts
 *
 * 🎯 Purpose:
 * Proves assignment policy and safe effective-permission summaries through owned ports.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { IamSafetyService } from '../safety';
import type { SubjectAccessRepository } from './contracts/subject-access.repository.interface';
import { UserAccessService } from './user-access.service';

describe('UserAccessService assignment boundary', () => {
  function fixture() {
    const facts = {
      subjectId: 'subject',
      roles: [
        { id: 'role', name: 'researcher', permissionKeys: ['z', 'a', 'z'] },
      ],
      directPermissions: [
        { id: 'permission', key: 'a' },
        { id: 'second', key: 'b' },
      ],
      email: 'never-return@example.test',
      passwordHash: 'never-return',
    };
    const access = {
      findAssignments: jest.fn().mockResolvedValue(facts),
      subjectExists: jest.fn().mockResolvedValue(true),
      roleExists: jest.fn().mockResolvedValue(true),
      permissionExists: jest.fn().mockResolvedValue(true),
      hasRole: jest.fn().mockResolvedValue(false),
      grantRole: jest.fn().mockResolvedValue(undefined),
      hasDirectPermission: jest.fn().mockResolvedValue(false),
      grantPermission: jest.fn().mockResolvedValue(undefined),
      revokePermission: jest.fn().mockResolvedValue(undefined),
    } satisfies jest.Mocked<SubjectAccessRepository>;
    const revocations = { revoke: jest.fn() };
    return {
      access,
      facts,
      revocations,
      service: new UserAccessService(
        access,
        revocations,
        new IamSafetyService(),
      ),
    };
  }
  it('allowlists output, preserves assignment order and sorts unique effective keys', async () => {
    const { service, facts } = fixture();
    const summary = await service.getSummary('subject');
    expect(summary).toEqual({
      userId: 'subject',
      roles: [{ id: 'role', name: 'researcher' }],
      directPermissions: [
        { id: 'permission', name: 'a' },
        { id: 'second', name: 'b' },
      ],
      effectivePermissions: ['a', 'b', 'z'],
    });
    summary.roles[0].name = 'Changed';
    expect(facts.roles[0].name).toBe('researcher');
  });
  it('denies missing summaries and propagates read failure without fallback', async () => {
    const { service, access } = fixture();
    access.findAssignments
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('read failed'));
    await expect(service.getSummary('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.getSummary('subject')).rejects.toThrow('read failed');
  });
  it('grants only the requested role and returns a fresh summary', async () => {
    const { service, access, revocations } = fixture();
    await service.grantRole('subject', {
      roleId: 'role',
      unsafe: 'ignored',
    } as { roleId: string });
    expect(access.grantRole).toHaveBeenCalledWith('subject', 'role');
    expect(access.findAssignments).toHaveBeenCalledWith('subject');
    expect(revocations.revoke).not.toHaveBeenCalled();
    access.hasRole.mockResolvedValue(true);
    await expect(
      service.grantRole('subject', { roleId: 'role' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(access.grantRole).toHaveBeenCalledTimes(1);
  });
  it('denies missing subject or role before role mutation', async () => {
    const { service, access } = fixture();
    access.subjectExists.mockResolvedValueOnce(false);
    await expect(
      service.grantRole('missing', { roleId: 'role' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(access.roleExists).not.toHaveBeenCalled();
    access.roleExists.mockResolvedValueOnce(false);
    await expect(
      service.grantRole('subject', { roleId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(access.grantRole).not.toHaveBeenCalled();
  });
  it('grants direct permissions and denies duplicate assignment', async () => {
    const { service, access } = fixture();
    await service.grantPermission('subject', { permissionId: 'permission' });
    expect(access.grantPermission).toHaveBeenCalledWith(
      'subject',
      'permission',
    );
    access.hasDirectPermission.mockResolvedValue(true);
    await expect(
      service.grantPermission('subject', { permissionId: 'permission' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(access.grantPermission).toHaveBeenCalledTimes(1);
  });
  it.each(['grantPermission', 'revokePermission'] as const)(
    'denies a missing permission before %s',
    async (method) => {
      const { service, access } = fixture();
      access.permissionExists.mockResolvedValue(false);
      const operation =
        method === 'grantPermission'
          ? service.grantPermission('subject', { permissionId: 'missing' })
          : service.revokePermission('subject', 'missing');
      await expect(operation).rejects.toBeInstanceOf(NotFoundException);
      expect(access.grantPermission).not.toHaveBeenCalled();
      expect(access.revokePermission).not.toHaveBeenCalled();
    },
  );
  it('denies absent direct assignment, revokes existing and propagates mutation failure', async () => {
    const { service, access } = fixture();
    await expect(
      service.revokePermission('subject', 'permission'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(access.revokePermission).not.toHaveBeenCalled();
    access.hasDirectPermission.mockResolvedValue(true);
    await service.revokePermission('subject', 'permission');
    expect(access.revokePermission).toHaveBeenCalledWith(
      'subject',
      'permission',
    );
    access.revokePermission.mockRejectedValue(new Error('write failed'));
    access.findAssignments.mockClear();
    await expect(
      service.revokePermission('subject', 'permission'),
    ).rejects.toThrow('write failed');
    expect(access.findAssignments).not.toHaveBeenCalled();
  });
});
