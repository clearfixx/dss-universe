/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/presentation/graphql/resolvers/reputation.resolver.ts
 *
 * 🎯 Purpose:
 * Exposes authenticated direct reputation and permission-backed controls.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';

import { ReputationService } from '../../../application/services/reputation.service';
import type {
  ReputationEntry,
  ReputationHistory,
  ReputationPolicy,
} from '../../../domain/types/reputation.type';
import { GiveReputationInput } from '../inputs/give-reputation.input';
import { ReputationPageInput } from '../inputs/reputation-page.input';
import { ReverseReputationInput } from '../inputs/reverse-reputation.input';
import { UpdateReputationPolicyInput } from '../inputs/update-reputation-policy.input';
import {
  ReputationEntryModel,
  ReputationHistoryModel,
  ReputationPolicyModel,
} from '../models/reputation.model';

@Resolver()
export class ReputationResolver {
  constructor(private readonly reputation: ReputationService) {}

  @Query(() => ReputationHistoryModel)
  @UseGuards(JwtAuthGuard)
  reputationHistory(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('pagination', { nullable: true }) pagination?: ReputationPageInput,
  ): Promise<ReputationHistory> {
    return this.reputation.history(userId, pagination?.page, pagination?.limit);
  }

  @Query(() => ReputationPolicyModel)
  @UseGuards(JwtAuthGuard)
  reputationPolicy(): Promise<ReputationPolicy> {
    return this.reputation.getPolicy();
  }

  @Mutation(() => ReputationEntryModel)
  @UseGuards(JwtAuthGuard)
  giveReputation(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: GiveReputationInput,
  ): Promise<ReputationEntry> {
    return this.reputation.give(
      actor.id,
      input.recipientId,
      input.value,
      input.reason,
    );
  }

  @Mutation(() => ReputationEntryModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ReputationReverse)
  reverseReputation(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ReverseReputationInput,
  ): Promise<ReputationEntry> {
    return this.reputation.reverse(input.entryId, actor.id, input.reason);
  }

  @Mutation(() => ReputationPolicyModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ReputationSettingsManage)
  updateReputationPolicy(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: UpdateReputationPolicyInput,
  ): Promise<ReputationPolicy> {
    return this.reputation.updatePolicy(input.minimumAccountAgeDays, actor.id);
  }
}

/**
 * The resolver opens doors; guards still inspect the clearance badge.
 */
