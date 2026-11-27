/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/presentation/community-rules.resolver.ts
 *
 * 🎯 Purpose:
 * Command Deck GraphQL for the community rules catalogue.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { IsBoolean, IsString, MaxLength } from 'class-validator';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';
import { ModerationSanctionError } from '../domain/errors/moderation-sanction.error';
import { CommunityRulesService } from '../infrastructure/prisma-community-rules';

@ObjectType('CommunityRule')
class CommunityRuleModel {
  @Field(() => ID) id!: string;
  @Field({ description: 'Rule number, e.g. 2.3.' }) code!: string;
  @Field() text!: string;
  @Field() active!: boolean;
}

@InputType()
class CommunityRuleInput {
  @Field() @IsString() @MaxLength(20) code!: string;
  @Field() @IsString() @MaxLength(2000) text!: string;
  @Field() @IsBoolean() active!: boolean;
}

@Resolver()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CommunityRulesResolver {
  constructor(private readonly rules: CommunityRulesService) {}

  @Query(() => [CommunityRuleModel])
  @RequirePermissions(Permission.ModerationRulesManage)
  communityRules(@AuthUser() actor: AuthenticatedUser) {
    return this.execute(this.rules.list(actor));
  }

  @Mutation(() => CommunityRuleModel)
  @RequirePermissions(Permission.ModerationRulesManage)
  createCommunityRule(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: CommunityRuleInput,
  ) {
    return this.execute(this.rules.create(actor, { ...input }));
  }

  @Mutation(() => CommunityRuleModel)
  @RequirePermissions(Permission.ModerationRulesManage)
  updateCommunityRule(
    @AuthUser() actor: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: CommunityRuleInput,
  ) {
    return this.execute(this.rules.update(actor, id, { ...input }));
  }

  private async execute<T>(operation: Promise<T>): Promise<T> {
    try {
      return await operation;
    } catch (error) {
      if (!(error instanceof ModerationSanctionError)) throw error;
      switch (error.code) {
        case 'ACCESS_DENIED':
          throw new ForbiddenException(error.message);
        case 'NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'INVALID_INPUT':
          throw new BadRequestException(error.message);
        case 'INVALID_STATE':
          throw new ConflictException(error.message);
      }
    }
  }
}
