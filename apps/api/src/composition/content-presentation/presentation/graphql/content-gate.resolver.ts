/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Content Presentation Composition
 * 📄 File: apps/api/src/composition/content-presentation/presentation/graphql/content-gate.resolver.ts
 *
 * 🎯 Purpose:
 * Preserves authenticated content operations through narrow owner capabilities.
 *
 * 🏗️ Architecture:
 * Root transport composition; policy and persistence remain with owners.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';
import {
  CONTENT_GATE_CREATOR,
  CONTENT_GATE_POLICY_EVALUATOR,
  type ContentGateCreator,
  type ContentGatePolicyEvaluator,
} from '@api/modules/content-access';
import { CreateContentGateInput } from './content-gate.input';
import {
  ContentGateModel,
  ContentGateEvaluationModel,
} from './content-gate.model';
import {
  toContentGateModel,
  toContentGateRequirementKind,
} from './content-gate.mapping';
@Resolver()
export class ContentGatesResolver {
  constructor(
    @Inject(CONTENT_GATE_CREATOR) private readonly creator: ContentGateCreator,
    @Inject(CONTENT_GATE_POLICY_EVALUATOR)
    private readonly evaluator: ContentGatePolicyEvaluator,
  ) {}
  @Mutation(() => ContentGateModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ContentGatesConfigure)
  async createContentGate(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: CreateContentGateInput,
  ): Promise<ContentGateModel> {
    const gate = await this.creator.create({
      ownerId: actor.id,
      operator: input.operator,
      requirements: input.requirements.map((requirement) => ({
        kind: requirement.kind,
        threshold: requirement.threshold ?? null,
        groupKey: requirement.groupKey?.trim() || null,
      })),
    });
    return toContentGateModel(gate);
  }
  @Query(() => ContentGateEvaluationModel)
  @UseGuards(JwtAuthGuard)
  async evaluateContentGate(
    @AuthUser() actor: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ContentGateEvaluationModel> {
    const evaluation = await this.evaluator.evaluate(id, actor.id);
    return {
      gate: toContentGateModel(evaluation.gate),
      allowed: evaluation.allowed,
      bypassed: evaluation.bypassed,
      unmet: evaluation.unmet.map(toContentGateRequirementKind),
      notice: evaluation.notice,
    };
  }
}
