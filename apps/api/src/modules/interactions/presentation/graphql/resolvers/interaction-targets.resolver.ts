/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/resolvers/interaction-targets.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes authenticated target discovery and capability checks.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';

import { InteractionTargetsService } from '../../../application/services/interaction-targets.service';
import type {
  InteractionAccessDecision,
  InteractionTarget,
} from '../../../domain/types/interaction-target.type';
import {
  InteractionAccessDecisionModel,
  InteractionCapabilityInput,
  InteractionTargetModel,
} from '../models/interaction-target.model';

@Resolver()
@UseGuards(JwtAuthGuard)
export class InteractionTargetsResolver {
  constructor(private readonly targets: InteractionTargetsService) {}

  @Query(() => InteractionTargetModel)
  async interactionTarget(
    @AuthUser() actor: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<InteractionTargetModel> {
    const decision = await this.targets.authorize(
      id,
      { kind: 'AUTHENTICATED', subjectId: actor.id },
      'READ',
    );
    if (!decision.allowed)
      throw new NotFoundException('Interaction target was not found.');
    return this.toTarget(decision.target);
  }

  @Query(() => InteractionAccessDecisionModel)
  async interactionTargetAccess(
    @AuthUser() actor: AuthenticatedUser,
    @Args('targetId', { type: () => ID }) targetId: string,
    @Args('capability', { type: () => InteractionCapabilityInput })
    capability: InteractionCapabilityInput,
  ): Promise<InteractionAccessDecisionModel> {
    const viewer = { kind: 'AUTHENTICATED', subjectId: actor.id } as const;
    const decision = await this.targets.authorize(targetId, viewer, capability);
    if (
      decision.target.kind === 'research-lab.page' ||
      decision.target.kind === 'comment'
    ) {
      const read =
        capability === InteractionCapabilityInput.READ
          ? decision
          : await this.targets.authorize(targetId, viewer, 'READ');
      if (!read.allowed)
        throw new NotFoundException('Interaction target was not found.');
    }
    return this.toDecision(decision);
  }
  private toDecision(
    decision: InteractionAccessDecision,
  ): InteractionAccessDecisionModel {
    return {
      ...decision,
      capability: decision.capability as InteractionCapabilityInput,
      target: this.toTarget(decision.target),
    };
  }

  private toTarget(target: InteractionTarget): InteractionTargetModel {
    return {
      ...target,
      createdAt: target.createdAt.toISOString(),
      updatedAt: target.updatedAt.toISOString(),
    };
  }
}

/**
 * Thin resolvers keep the policy engine in the engine room.
 */
