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

import { UseGuards } from '@nestjs/common';
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
    @Args('id', { type: () => ID }) id: string,
  ): Promise<InteractionTargetModel> {
    return this.toTarget(await this.targets.getById(id));
  }

  @Query(() => InteractionAccessDecisionModel)
  async interactionTargetAccess(
    @AuthUser() actor: AuthenticatedUser,
    @Args('targetId', { type: () => ID }) targetId: string,
    @Args('capability', { type: () => InteractionCapabilityInput })
    capability: InteractionCapabilityInput,
  ): Promise<InteractionAccessDecisionModel> {
    return this.toDecision(
      await this.targets.authorize(targetId, actor.id, capability),
    );
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
