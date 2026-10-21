/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Roles
 * 📄 File: apps/api/src/modules/iam/roles/roles.service.spec.ts
 *
 * 🎯 Purpose:
 * Proves role business rules and mutation denial through the owned repository.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { IamSafetyService } from '../safety';
import type { RoleRepository } from './contracts/role.repository.interface';

describe('RolesService owned persistence', () => {
  const role = {
    id: 'role',
    name: 'researcher',
    label: 'Researcher',
    description: null,
    isSystem: false,
  };
  const response = { ...role, permissions: [] };
  let repository: ReturnType<typeof createRepository>;
  let service: RolesService;
  function createRepository() {
    return {
      findIdByName: jest.fn().mockResolvedValue(null),
      findRecordById: jest.fn().mockResolvedValue(role),
      findById: jest.fn().mockResolvedValue(response),
      findAll: jest.fn().mockResolvedValue([response]),
      create: jest.fn().mockResolvedValue(response),
      update: jest.fn().mockResolvedValue(response),
      remove: jest.fn().mockResolvedValue(undefined),
      permissionExists: jest.fn().mockResolvedValue(true),
      countPermissions: jest.fn().mockResolvedValue(1),
      hasPermission: jest.fn().mockResolvedValue(false),
      assignPermission: jest.fn().mockResolvedValue(undefined),
      revokePermission: jest.fn().mockResolvedValue(undefined),
    } satisfies jest.Mocked<RoleRepository>;
  }
  beforeEach(() => {
    repository = createRepository();
    service = new RolesService(repository, new IamSafetyService());
  });
  it('allowlists create input and checks distinct permission IDs without altering nested writes', async () => {
    const input = {
      name: role.name,
      label: role.label,
      permissionIds: ['p', 'p'],
      isSystem: true,
    };
    expect(await service.create(input)).toEqual(response);
    expect(repository.countPermissions).toHaveBeenCalledWith(['p']);
    expect(repository.create).toHaveBeenCalledWith({
      name: role.name,
      label: role.label,
      description: undefined,
      permissionIds: ['p', 'p'],
    });
  });
  it('rejects duplicate names before creating or checking permissions', async () => {
    repository.findIdByName.mockResolvedValue('other');
    await expect(
      service.create({ name: role.name, label: role.label }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.countPermissions).not.toHaveBeenCalled();
  });
  it('rejects missing permissions without a role write', async () => {
    repository.countPermissions.mockResolvedValue(0);
    await expect(
      service.create({
        name: role.name,
        label: role.label,
        permissionIds: ['missing'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.create).not.toHaveBeenCalled();
  });
  it('returns repository reads and rejects missing roles', async () => {
    expect(await service.findAll()).toEqual([response]);
    expect(await service.findOne('role')).toEqual(response);
    repository.findById.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it('denies system update and deletion before persistence', async () => {
    repository.findRecordById.mockResolvedValue({ ...role, isSystem: true });
    await expect(
      service.update('role', { label: 'Changed' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.remove('role')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.remove).not.toHaveBeenCalled();
  });
  it.each(['admin', 'super_admin', ' ADMIN '])(
    'protects critical role %s from rename and deletion',
    async (name) => {
      repository.findRecordById.mockResolvedValue({ ...role, name });
      await expect(
        service.update('role', { name: 'changed' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.remove('role')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    },
  );
  it('checks rename conflicts and allowlists metadata', async () => {
    repository.findIdByName
      .mockResolvedValueOnce('other')
      .mockResolvedValueOnce(role.id);
    await expect(
      service.update(role.id, { name: 'other' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.update).not.toHaveBeenCalled();
    await service.update(role.id, {
      name: 'new',
      label: 'New',
      isSystem: true,
    } as { name: string; label: string });
    expect(repository.update).toHaveBeenCalledWith(role.id, {
      name: 'new',
      label: 'New',
      description: undefined,
    });
  });
  it('preserves deletion response and missing-role denial', async () => {
    expect(await service.remove(role.id)).toEqual({ deleted: true, role });
    repository.findRecordById.mockResolvedValue(null);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.remove).toHaveBeenCalledTimes(1);
  });
  it('assigns only new, existing permissions and returns the fresh role', async () => {
    expect(
      await service.assignPermission(role.id, { permissionId: 'p' }),
    ).toEqual(response);
    expect(repository.assignPermission).toHaveBeenCalledWith(role.id, 'p');
    repository.hasPermission.mockResolvedValue(true);
    await expect(
      service.assignPermission(role.id, { permissionId: 'p' }),
    ).rejects.toBeInstanceOf(ConflictException);
    repository.permissionExists.mockResolvedValue(false);
    await expect(
      service.assignPermission(role.id, { permissionId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.assignPermission).toHaveBeenCalledTimes(1);
  });
  it('revokes only existing assignments and propagates storage failure', async () => {
    await expect(service.revokePermission(role.id, 'p')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.revokePermission).not.toHaveBeenCalled();
    repository.hasPermission.mockResolvedValue(true);
    expect(await service.revokePermission(role.id, 'p')).toEqual(response);
    repository.revokePermission.mockRejectedValue(new Error('storage failure'));
    await expect(service.revokePermission(role.id, 'p')).rejects.toThrow(
      'storage failure',
    );
  });
});
