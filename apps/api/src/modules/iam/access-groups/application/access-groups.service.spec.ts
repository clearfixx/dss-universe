/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Verification
 * 📄 File: apps/api/src/modules/iam/access-groups/application/access-groups.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies fail-closed access policy and isolated capability behavior.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AccessGroupsService } from './access-groups.service';
import { AccessGroupKeyConflict } from '../domain/access-group.errors';
import type { AccessGroupRepository } from '../contracts/access-group.repository.interface';
import type { GroupManagementAuthority } from '../contracts/group-management-authority.contract';
import type {
  AccessGroupRecord,
  CreateAccessGroup,
  GrantAccessMembership,
  UpdateAccessGroup,
} from '../domain/access-group.types';

describe('AccessGroupsService', () => {
  const repository: jest.Mocked<AccessGroupRepository> = {
    publicGroups: jest.fn(),
    list: jest.fn(),
    memberships: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    setCapabilities: jest.fn(),
    grant: jest.fn(),
    revoke: jest.fn(),
    effectiveMemberships: jest.fn(),
  };
  const authority: jest.Mocked<GroupManagementAuthority> = {
    canManage: jest.fn(),
  };
  const service = new AccessGroupsService(repository, authority);
  const create: CreateAccessGroup = {
    key: 'researchers',
    displayName: 'Researchers',
    capabilities: [],
  };
  const grant: GrantAccessMembership = {
    groupId: 'group',
    subjectId: 'subject',
    validFrom: new Date('2030-01-01'),
    validUntil: null,
  };
  beforeEach(() => {
    jest.resetAllMocks();
    authority.canManage.mockResolvedValue(true);
  });
  const commands: Array<[string, () => Promise<unknown>]> = [
    ['create', () => service.create('actor', create)],
    ['list', () => service.list('actor')],
    ['find', () => service.find('actor', 'group')],
    ['update', () => service.update('actor', 'group', {})],
    ['capabilities', () => service.setCapabilities('actor', 'group', [])],
    ['grant', () => service.grant('actor', grant)],
    ['revoke', () => service.revoke('actor', 'membership', 'Reviewed')],
    ['history', () => service.memberships('actor', { subjectId: 'subject' })],
  ];
  it.each(commands)(
    'denies %s without current management authority',
    async (_name, command) => {
      authority.canManage.mockResolvedValue(false);
      await expect(command()).rejects.toBeInstanceOf(ForbiddenException);
      for (const method of Object.values(repository))
        expect(method).not.toHaveBeenCalled();
    },
  );
  it('maps only a known duplicate-key conflict', async () => {
    repository.create
      .mockRejectedValueOnce(new AccessGroupKeyConflict())
      .mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(service.create('actor', create)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.create('actor', create)).rejects.toThrow(
      'audit unavailable',
    );
  });
  it.each([
    { ...create, key: 'premium' },
    { ...create, key: 'Admin' },
    { ...create, displayName: ' ' },
    { ...create, color: 'red' },
    { ...create, icon: '../file' },
    { ...create, capabilities: ['permissions.manage'] },
  ])('rejects unsafe group values %j', async (input) => {
    await expect(
      service.create('actor', input as CreateAccessGroup),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create.mock.calls).toHaveLength(0);
  });
  it('does not allow Premium delegated capabilities', async () => {
    repository.findById.mockResolvedValue({
      kind: 'PREMIUM',
    } as AccessGroupRecord);
    await expect(
      service.setCapabilities('actor', 'group', ['KNOWLEDGE_FORGE_GUARDIAN']),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.setCapabilities.mock.calls).toHaveLength(0);
  });
  it.each([
    new Date('invalid'),
    new Date('2029-01-01'),
    new Date('2030-01-01'),
  ])('rejects invalid or nonincreasing expiry %s', async (validUntil) => {
    await expect(
      service.grant('actor', { ...grant, validUntil }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.grant.mock.calls).toHaveLength(0);
  });
  it('validates direct callers, not only HTTP decorators', async () => {
    await expect(
      service.grant('actor', {
        ...grant,
        validFrom: 'invalid',
      } as unknown as GrantAccessMembership),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.update('actor', 'group', {
        enabled: null,
      } as unknown as UpdateAccessGroup),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.revoke('actor', 'membership', ' '),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.memberships('actor', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.list('actor', undefined, 101)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
  it('maps missing mutation targets to 404', async () => {
    repository.findById.mockResolvedValue(null);
    repository.update.mockResolvedValue(null);
    repository.grant.mockResolvedValue(null);
    repository.revoke.mockResolvedValue(null);
    await expect(service.find('actor', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.update('actor', 'missing', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.setCapabilities('actor', 'missing', []),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.grant('actor', grant)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.revoke('actor', 'missing', 'Reviewed'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('trims an attributable revocation reason and uses a server date', async () => {
    repository.revoke.mockResolvedValue(null);
    await expect(
      service.revoke('actor', 'membership', ' Reviewed '),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.revoke.mock.calls).toContainEqual([
      'membership',
      'actor',
      'Reviewed',
      expect.any(Date),
    ]);
  });
});
