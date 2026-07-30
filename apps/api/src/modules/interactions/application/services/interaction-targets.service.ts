/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/interaction-targets.service.ts
 *
 * 🎯 Purpose:
 * Resolves canonical targets and enforces owner-controlled capabilities.
 *
 * 🧠 Responsibilities:
 * • loads canonical interaction identities;
 * • applies lifecycle restrictions before owner policy;
 * • fails closed when a target or policy is unavailable.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  INTERACTION_TARGETS_REPOSITORY,
  type InteractionTargetsRepository,
} from '../../domain/repositories/interaction-targets.repository.interface';
import type {
  InteractionAccessDecision,
  InteractionCapability,
  InteractionTarget,
} from '../../domain/types/interaction-target.type';
import { InteractionPolicyRegistryService } from './interaction-policy-registry.service';

@Injectable()
export class InteractionTargetsService {
  constructor(
    @Inject(INTERACTION_TARGETS_REPOSITORY)
    private readonly targets: InteractionTargetsRepository,
    private readonly policies: InteractionPolicyRegistryService,
  ) {}

  async getById(id: string): Promise<InteractionTarget> {
    const target = await this.targets.findById(id);
    if (!target) {
      throw new NotFoundException('Interaction target was not found.');
    }
    return target;
  }

  async authorize(
    targetId: string,
    actorId: string,
    capability: InteractionCapability,
  ): Promise<InteractionAccessDecision> {
    const target = await this.getById(targetId);
    if (target.status === 'RETIRED') {
      return { target, capability, allowed: false, reason: 'TARGET_RETIRED' };
    }
    if (target.status === 'LOCKED' && capability !== 'READ') {
      return { target, capability, allowed: false, reason: 'TARGET_LOCKED' };
    }
    const decision = await this.policies.authorize(target, actorId, capability);
    return {
      target,
      capability,
      allowed: decision.allowed,
      reason: decision.reason ?? null,
    };
  }
}

/**
 * A shared feature may ask for access. Only the owner gets to answer.
 */
