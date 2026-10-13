/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Permissions
 * 📄 File: apps/api/src/modules/iam/permissions/permissions.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies permission conflicts, missing records and mutation failure boundaries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PermissionRepository } from './contracts/permission.repository.interface';
import { PermissionsService } from './permissions.service';

describe('IAM PermissionsService', () => {
  const repository = {
    findIdByKey: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    createWithAudit: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  } satisfies jest.Mocked<PermissionRepository>;
  const service = new PermissionsService(repository);
  const permission = {
    id: 'p',
    key: 'test.read',
    label: 'Read',
    description: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  beforeEach(() => {
    jest.resetAllMocks();
    repository.findIdByKey.mockResolvedValue(null);
    repository.findById.mockResolvedValue(permission);
    repository.createWithAudit.mockResolvedValue(permission);
    repository.update.mockResolvedValue(permission);
  });
  it('rejects a duplicate key before a write', async () => {
    repository.findIdByKey.mockResolvedValue('existing');
    await expect(
      service.create({ key: 'test.read', label: 'Read' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.createWithAudit).not.toHaveBeenCalled();
  });
  it('allowlists creation fields and delegates atomic audit with its actor', async () => {
    await service.create(
      { key: 'test.read', label: 'Read', unexpected: 'not-persisted' } as never,
      'actor',
    );
    expect(repository.createWithAudit).toHaveBeenCalledWith(
      { key: 'test.read', label: 'Read', description: undefined },
      'actor',
    );
  });
  it.each(['findOne', 'remove', 'update'] as const)(
    'rejects missing permission during %s before mutation',
    async (operation) => {
      repository.findById.mockResolvedValue(null);
      await expect(service[operation]('missing', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    },
  );
  it('allows its own key but rejects another permission key during update', async () => {
    repository.findIdByKey.mockResolvedValue('p');
    await expect(service.update('p', { key: 'test.read' })).resolves.toEqual(
      permission,
    );
    repository.update.mockClear();
    repository.findIdByKey.mockResolvedValue('other');
    await expect(
      service.update('p', { key: 'other.read' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.update).not.toHaveBeenCalled();
  });
  it('propagates creation failure without reporting success', async () => {
    repository.createWithAudit.mockRejectedValue(new Error('audit failed'));
    await expect(
      service.create({ key: 'test.read', label: 'Read' }),
    ).rejects.toThrow('audit failed');
  });
  it('does not report deletion when persistence fails', async () => {
    repository.remove.mockRejectedValue(new Error('offline'));
    await expect(service.remove('p')).rejects.toThrow('offline');
  });
});
