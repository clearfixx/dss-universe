/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/presentation/graphql/content-gates.graphql.ts
 *
 * 🎯 Purpose:
 * Exposes permission-protected Content Gate creation and viewer evaluation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from '@nestjs/graphql';
import {
  ContentGateOperator,
  ContentGateRequirementKind,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';

import { ContentGatesService } from '../../application/services/content-gates.service';
import type {
  ContentGate,
  ContentGateEvaluation,
} from '../../domain/types/content-gate.type';

registerEnumType(ContentGateOperator, { name: 'ContentGateOperator' });
registerEnumType(ContentGateRequirementKind, {
  name: 'ContentGateRequirementKind',
});

@InputType()
class ContentGateRequirementInput {
  @Field(() => ContentGateRequirementKind)
  @IsEnum(ContentGateRequirementKind)
  kind!: ContentGateRequirementKind;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  threshold?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  groupKey?: string;
}

@InputType()
export class CreateContentGateInput {
  @Field(() => ContentGateOperator)
  @IsEnum(ContentGateOperator)
  operator!: ContentGateOperator;

  @Field(() => [ContentGateRequirementInput])
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ContentGateRequirementInput)
  requirements!: ContentGateRequirementInput[];
}

@ObjectType()
class ContentGateRequirementModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ContentGateRequirementKind)
  kind!: ContentGateRequirementKind;

  @Field(() => Int, { nullable: true })
  threshold!: number | null;

  @Field(() => String, { nullable: true })
  groupKey!: string | null;
}

@ObjectType()
class ContentGateModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  ownerId!: string;

  @Field(() => ContentGateOperator)
  operator!: ContentGateOperator;

  @Field(() => [ContentGateRequirementModel])
  requirements!: ContentGateRequirementModel[];

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

@ObjectType()
class ContentGateEvaluationModel {
  @Field(() => ContentGateModel)
  gate!: ContentGateModel;

  @Field()
  allowed!: boolean;

  @Field()
  bypassed!: boolean;

  @Field(() => [ContentGateRequirementKind])
  unmet!: ContentGateRequirementKind[];

  @Field()
  notice!: string;
}

@Resolver()
export class ContentGatesResolver {
  constructor(private readonly gates: ContentGatesService) {}

  @Mutation(() => ContentGateModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ContentGatesConfigure)
  createContentGate(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: CreateContentGateInput,
  ): Promise<ContentGate> {
    return this.gates.create({
      ownerId: actor.id,
      operator: input.operator,
      requirements: input.requirements.map((requirement) => ({
        kind: requirement.kind,
        threshold: requirement.threshold ?? null,
        groupKey: requirement.groupKey?.trim() || null,
      })),
    });
  }

  @Query(() => ContentGateEvaluationModel)
  @UseGuards(JwtAuthGuard)
  evaluateContentGate(
    @AuthUser() actor: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<ContentGateEvaluation> {
    return this.gates.evaluate(id, actor.id);
  }
}

/** The API returns requirements and verdicts, never protected payloads on denial. */
