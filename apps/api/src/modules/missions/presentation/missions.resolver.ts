/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Missions
 * 📄 File: apps/api/src/modules/missions/presentation/missions.resolver.ts
 *
 * 🎯 Purpose:
 * GraphQL transport for community missions: the public list of running
 * missions with the viewer's progress, and staff management.
 *
 * ⚠️ Important:
 * Writes require `missions.manage`; rules live in the domain.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Field,
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
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { OptionalViewerJwtGuard } from '@api/core/auth/guards/optional-viewer-jwt.guard';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';
import { MISSION_METRICS, type MissionMetric } from '../domain/mission.rules';
import {
  MissionsService,
  type MissionView,
} from '../infrastructure/prisma-missions.service';

const MetricEnum = Object.fromEntries(
  MISSION_METRICS.map((value) => [value, value]),
) as Record<MissionMetric, MissionMetric>;
registerEnumType(MetricEnum, {
  name: 'CommunityMissionMetric',
  description:
    'TOPICS: topics opened; REPLIES: replies written; ACCEPTED_ANSWERS: replies accepted as answers; REPUTATION: net reputation received. Public sections only.',
});

@ObjectType('CommunityMission')
export class CommunityMissionModel {
  @Field(() => ID) id!: string;
  @Field() title!: string;
  @Field(() => String, { nullable: true }) description!: string | null;
  @Field(() => MetricEnum) metric!: MissionMetric;
  @Field(() => Int) target!: number;
  @Field() startsAt!: Date;
  @Field() endsAt!: Date;
  @Field() active!: boolean;
  @Field(() => Int, {
    nullable: true,
    description:
      'Signed-in viewer progress in the mission window; null for guests.',
  })
  viewerProgress!: number | null;
}

@InputType()
export class CommunityMissionInput {
  @Field()
  @IsString()
  @MaxLength(200)
  title!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @Field(() => MetricEnum)
  @IsIn(MISSION_METRICS)
  metric!: MissionMetric;

  @Field(() => Int)
  @IsInt()
  target!: number;

  @Field()
  @IsDate()
  startsAt!: Date;

  @Field()
  @IsDate()
  endsAt!: Date;

  @Field({ defaultValue: true })
  @IsBoolean()
  active!: boolean;
}

type RequestContext = { req: { user?: AuthenticatedUser } };

@Resolver()
export class MissionsResolver {
  constructor(private readonly missions: MissionsService) {}

  @Query(() => [CommunityMissionModel], {
    description: 'Running missions (active, started, not ended).',
  })
  @UseGuards(OptionalViewerJwtGuard)
  communityMissions(@Context() ctx: RequestContext): Promise<MissionView[]> {
    return this.missions.current(ctx.req.user?.id ?? null);
  }

  @Query(() => [CommunityMissionModel])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MissionsManage)
  communityMissionsAdmin(): Promise<MissionView[]> {
    return this.missions.all();
  }

  @Mutation(() => CommunityMissionModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MissionsManage)
  createCommunityMission(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: CommunityMissionInput,
  ): Promise<MissionView> {
    return this.missions.create(actor.id, this.toInput(input));
  }

  @Mutation(() => CommunityMissionModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MissionsManage)
  updateCommunityMission(
    @AuthUser() actor: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: CommunityMissionInput,
  ): Promise<MissionView> {
    return this.missions.update(actor.id, id, this.toInput(input));
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MissionsManage)
  deleteCommunityMission(
    @AuthUser() actor: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.missions.remove(actor.id, id);
  }

  private toInput(input: CommunityMissionInput) {
    return {
      title: input.title,
      description: input.description ?? null,
      metric: input.metric,
      target: input.target,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      active: input.active,
    };
  }
}
