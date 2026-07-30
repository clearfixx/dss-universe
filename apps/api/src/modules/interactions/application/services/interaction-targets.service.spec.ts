/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/interaction-targets.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies lifecycle and owner-policy authorization precedence.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { NotFoundException } from '@nestjs/common';

import type { InteractionTargetsRepository } from '../../domain/repositories/interaction-targets.repository.interface';
import type { InteractionTarget } from '../../domain/types/interaction-target.type';
import { InteractionPolicyRegistryService } from './interaction-policy-registry.service';
import { InteractionTargetsService } from './interaction-targets.service';

describe('InteractionTargetsService', () => {
  const target: InteractionTarget = {
    id: 'target-1',
    kind: 'test.kind',
    ownerModule: 'test',
    ownerType: 'TestRecord',
    ownerId: 'record-1',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  let repository: jest.Mocked<InteractionTargetsRepository>;
  let policies: InteractionPolicyRegistryService;
  let service: InteractionTargetsService;

  beforeEach(() => {
    repository = { findById: jest.fn().mockResolvedValue(target) };
    policies = new InteractionPolicyRegistryService();
    service = new InteractionTargetsService(repository, policies);
  });

  it('delegates active target decisions to its owner policy', async () => {
    policies.register({
      kind: target.kind,
      authorize: jest.fn().mockResolvedValue({ allowed: true }),
    });

    await expect(
      service.authorize(target.id, 'actor-1', 'COMMENT'),
    ).resolves.toMatchObject({ allowed: true, reason: null });
  });

  it('fails closed when no owner policy is registered', async () => {
    await expect(
      service.authorize(target.id, 'actor-1', 'REACT'),
    ).resolves.toMatchObject({
      allowed: false,
      reason: 'OWNER_POLICY_UNAVAILABLE',
    });
  });

  it('allows only read checks for locked targets', async () => {
    repository.findById.mockResolvedValue({ ...target, status: 'LOCKED' });
    policies.register({
      kind: target.kind,
      authorize: jest.fn().mockResolvedValue({ allowed: true }),
    });

    await expect(
      service.authorize(target.id, 'actor-1', 'COMMENT'),
    ).resolves.toMatchObject({ allowed: false, reason: 'TARGET_LOCKED' });
    await expect(
      service.authorize(target.id, 'actor-1', 'READ'),
    ).resolves.toMatchObject({ allowed: true });
  });

  it('denies every capability for retired and missing targets', async () => {
    repository.findById.mockResolvedValue({ ...target, status: 'RETIRED' });
    await expect(
      service.authorize(target.id, 'actor-1', 'READ'),
    ).resolves.toMatchObject({ allowed: false, reason: 'TARGET_RETIRED' });

    repository.findById.mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

/**
 * Lifecycle gates run first; owner policy never gets to resurrect a target.
 */
