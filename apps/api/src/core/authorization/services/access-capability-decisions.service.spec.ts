/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Verification
 * 📄 File: apps/api/src/core/authorization/services/access-capability-decisions.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies fail-closed access policy and isolated capability behavior.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { AccessCapabilityDecisionsService } from './access-capability-decisions.service';
import type {
  AccessMembershipsReader,
  SubjectEligibilityReader,
} from '../contracts/access-memberships-reader.contract';
import type { SubjectAccessReader } from '../contracts/subject-access-reader.interface';

describe('AccessCapabilityDecisionsService', () => {
  const memberships: jest.Mocked<AccessMembershipsReader> = { read: jest.fn() };
  const eligibility: jest.Mocked<SubjectEligibilityReader> = {
    isEligible: jest.fn(),
  };
  const access: jest.Mocked<SubjectAccessReader> = {
    getAccessProfileByUserId: jest.fn(),
  };
  const service = new AccessCapabilityDecisionsService(
    memberships,
    eligibility,
    access,
  );
  const now = new Date('2030-01-01');
  beforeEach(() => {
    jest.resetAllMocks();
    eligibility.isEligible.mockResolvedValue(true);
    memberships.read.mockResolvedValue([]);
    access.getAccessProfileByUserId.mockResolvedValue({
      roles: [],
      permissions: [],
    });
  });
  it('distinguishes namespaced custom groups from legacy and explicit system roles', async () => {
    memberships.read.mockResolvedValue([
      { key: 'admin', premium: false, capabilities: [] },
    ]);
    access.getAccessProfileByUserId.mockResolvedValue({
      roles: ['moderators'],
      permissions: [],
    });
    expect(await service.audience('subject', now)).toEqual({
      groups: ['moderators', 'role:moderators', 'group:admin'],
      premium: false,
    });
    expect(memberships.read.mock.calls).toContainEqual(['subject', now]);
    expect(await service.canManageGroups('subject')).toBe(false);
  });
  it('never aliases a reserved-namespace system role as an access group', async () => {
    access.getAccessProfileByUserId.mockResolvedValue({
      roles: ['group:admin', 'ROLE:admin'],
      permissions: [],
    });
    expect((await service.audience('subject', now))?.groups).toEqual([
      'role:group:admin',
      'role:ROLE:admin',
    ]);
  });
  it('does not infer Premium or Guardian from system role or display-like names', async () => {
    access.getAccessProfileByUserId.mockResolvedValue({
      roles: ['PREMIUM', 'Guardian'],
      permissions: [],
    });
    expect(await service.audience('subject', now)).toMatchObject({
      premium: false,
    });
    expect(await service.hasKnowledgeForgeGuardian('subject', now)).toBe(false);
  });
  it('keeps Premium non-staff and denies a forged Premium capability', async () => {
    memberships.read.mockResolvedValue([
      {
        key: 'premium',
        premium: true,
        capabilities: ['KNOWLEDGE_FORGE_GUARDIAN', 'permissions.manage'],
      },
    ]);
    expect(await service.audience('subject', now)).toMatchObject({
      premium: true,
    });
    expect(await service.hasKnowledgeForgeGuardian('subject', now)).toBe(false);
    expect(await service.canManageGroups('subject')).toBe(false);
  });
  it('grants only explicit Guardian, without implying Premium or management', async () => {
    memberships.read.mockResolvedValue([
      {
        key: 'guardians',
        premium: false,
        capabilities: ['KNOWLEDGE_FORGE_GUARDIAN'],
      },
    ]);
    expect(await service.hasKnowledgeForgeGuardian('subject', now)).toBe(true);
    expect(await service.audience('subject', now)).toMatchObject({
      premium: false,
    });
    expect(await service.canManageGroups('subject')).toBe(false);
    memberships.read.mockResolvedValue([
      { key: 'guardians', premium: false, capabilities: ['UNKNOWN'] },
    ]);
    expect(await service.hasKnowledgeForgeGuardian('subject', now)).toBe(false);
  });
  it('preserves independent staff authority for a Premium member', async () => {
    memberships.read.mockResolvedValue([
      { key: 'premium', premium: true, capabilities: [] },
    ]);
    access.getAccessProfileByUserId.mockResolvedValue({
      roles: ['admin'],
      permissions: ['permissions.manage'],
    });
    expect(await service.canManageGroups('subject')).toBe(true);
    expect(await service.hasKnowledgeForgeGuardian('subject', now)).toBe(false);
    access.getAccessProfileByUserId.mockResolvedValue({
      roles: [],
      permissions: [],
    });
    expect(await service.canManageGroups('subject')).toBe(false);
  });
  it('denies inactive or missing accounts before any capability reads', async () => {
    eligibility.isEligible.mockResolvedValue(false);
    expect(await service.audience('subject', now)).toBeNull();
    expect(await service.hasKnowledgeForgeGuardian('subject', now)).toBe(false);
    expect(await service.canManageGroups('subject')).toBe(false);
    expect(memberships.read.mock.calls).toHaveLength(0);
    expect(access.getAccessProfileByUserId.mock.calls).toHaveLength(0);
  });
  it('propagates provider failures without manufacturing grants', async () => {
    memberships.read.mockRejectedValue(new Error('evidence unavailable'));
    await expect(service.audience('subject', now)).rejects.toThrow(
      'evidence unavailable',
    );
    await expect(
      service.hasKnowledgeForgeGuardian('subject', now),
    ).rejects.toThrow('evidence unavailable');
    eligibility.isEligible.mockRejectedValue(
      new Error('eligibility unavailable'),
    );
    await expect(service.canManageGroups('subject')).rejects.toThrow(
      'eligibility unavailable',
    );
  });
});
