/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM User Access
 * 📄 File: apps/api/src/modules/iam/user-access/user-access.service.spec.ts
 *
 * 🎯 Purpose:
 * Proves application-owned last-holder policy and compatible revocation errors.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { SubjectAccessRepository } from './contracts/subject-access.repository.interface';
import { IamSafetyService } from '../safety';
import type {
  RoleRevocationRepository,
  RoleRevocationResult,
} from './contracts/role-revocation.repository.interface';
import { UserAccessService } from './user-access.service';

describe('UserAccessService atomic role revocation', () => {
  function fixture(
    roleName = 'admin',
    count = 1,
    result: RoleRevocationResult = 'revoked',
  ) {
    const findAssignments = jest.fn().mockResolvedValue({
      subjectId: 'subject',
      roles: [],
      directPermissions: [],
    });
    const access = {
      findAssignments,
      subjectExists: jest.fn(),
      roleExists: jest.fn(),
      permissionExists: jest.fn(),
      hasRole: jest.fn(),
      grantRole: jest.fn(),
      hasDirectPermission: jest.fn(),
      grantPermission: jest.fn(),
      revokePermission: jest.fn(),
    } satisfies jest.Mocked<SubjectAccessRepository>;
    const repository = {
      revoke: jest.fn(
        (
          _subject: string,
          _role: string,
          policy: Parameters<RoleRevocationRepository['revoke']>[2],
        ) => {
          if (result === 'revoked')
            policy({ roleName, adminsWithRoleCount: count });
          return Promise.resolve(result);
        },
      ),
    } satisfies RoleRevocationRepository;
    const service = new UserAccessService(
      access,
      repository,
      new IamSafetyService(),
    );
    return { service, findAssignments, repository };
  }
  it.each(['admin', 'super_admin', ' ADMIN '])(
    'denies the sole %s holder without reading a success summary',
    async (name) => {
      const { service, findAssignments } = fixture(name);
      await expect(
        service.revokeRole('subject', 'role'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(findAssignments).not.toHaveBeenCalled();
    },
  );
  it.each([
    ['admin', 2],
    ['super_admin', 2],
    ['researcher', 1],
  ] as const)('allows %s revocation with %i holder(s)', async (name, count) => {
    const { service, repository } = fixture(name, count);
    expect(await service.revokeRole('subject', 'role')).toEqual({
      userId: 'subject',
      roles: [],
      directPermissions: [],
      effectivePermissions: [],
    });
    expect(repository.revoke).toHaveBeenCalledWith(
      'subject',
      'role',
      expect.any(Function),
    );
  });
  it.each([
    'subject-not-found',
    'role-not-found',
    'assignment-not-found',
  ] as const)('preserves %s denial', async (result) => {
    const { service, findAssignments } = fixture('admin', 2, result);
    await expect(service.revokeRole('subject', 'role')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findAssignments).not.toHaveBeenCalled();
  });
  it('propagates failed persistence without returning a success summary', async () => {
    const { service, repository, findAssignments } = fixture();
    repository.revoke.mockRejectedValue(
      new Error('synthetic persistence failure'),
    );
    await expect(service.revokeRole('subject', 'role')).rejects.toThrow(
      'synthetic persistence failure',
    );
    expect(findAssignments).not.toHaveBeenCalled();
  });
});
