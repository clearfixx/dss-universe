/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Events
 * 📄 File: apps/api/src/modules/events/presentation/events.resolver.ts
 *
 * 🎯 Purpose:
 * GraphQL transport for community events: public upcoming list and staff
 * management.
 *
 * ⚠️ Important:
 * Writes require `events.manage`; rules live in the domain.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  ResolveField,
  Parent,
  Resolver,
} from '@nestjs/graphql';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';
import {
  EVENT_FORMATS,
  eventEndsAt,
  type CommunityEvent,
  type EventFormat,
} from '../domain/event.rules';
import { CommunityEventsService } from '../infrastructure/prisma-events.service';

const FormatEnum = Object.fromEntries(
  EVENT_FORMATS.map((value) => [value, value]),
) as Record<EventFormat, EventFormat>;
registerEnumType(FormatEnum, { name: 'CommunityEventFormat' });

@ObjectType('CommunityEvent')
export class CommunityEventModel {
  @Field(() => ID) id!: string;
  @Field() title!: string;
  @Field(() => String, { nullable: true }) description!: string | null;
  @Field() startsAt!: Date;
  @Field(() => Int) durationMinutes!: number;
  @Field(() => FormatEnum) format!: EventFormat;
  @Field(() => String, { nullable: true, description: 'Place (offline).' })
  location!: string | null;
  @Field(() => String, { nullable: true, description: 'Link (online).' })
  url!: string | null;
}

@InputType()
export class CommunityEventInput {
  @Field()
  @IsString()
  @MaxLength(200)
  title!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @Field()
  @IsDate()
  startsAt!: Date;

  @Field(() => Int)
  @IsInt()
  durationMinutes!: number;

  @Field(() => FormatEnum)
  @IsIn(EVENT_FORMATS)
  format!: EventFormat;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  location?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  url?: string | null;
}

@Resolver(() => CommunityEventModel)
export class CommunityEventsResolver {
  constructor(private readonly events: CommunityEventsService) {}

  @Query(() => [CommunityEventModel], {
    description: 'Events that have not finished yet, soonest first (max 20).',
  })
  communityEvents(
    @Args('limit', { type: () => Int, defaultValue: 5 }) limit: number,
  ): Promise<CommunityEvent[]> {
    return this.events.upcoming(limit);
  }

  @Query(() => [CommunityEventModel])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EventsManage)
  communityEventsAdmin(): Promise<CommunityEvent[]> {
    return this.events.all();
  }

  @Mutation(() => CommunityEventModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EventsManage)
  createCommunityEvent(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: CommunityEventInput,
  ): Promise<CommunityEvent> {
    return this.events.create(actor.id, this.toInput(input));
  }

  @Mutation(() => CommunityEventModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EventsManage)
  updateCommunityEvent(
    @AuthUser() actor: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: CommunityEventInput,
  ): Promise<CommunityEvent> {
    return this.events.update(actor.id, id, this.toInput(input));
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EventsManage)
  deleteCommunityEvent(
    @AuthUser() actor: AuthenticatedUser,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.events.remove(actor.id, id);
  }

  @ResolveField(() => Date)
  endsAt(@Parent() event: CommunityEvent): Date {
    return eventEndsAt(event);
  }

  private toInput(input: CommunityEventInput) {
    return {
      title: input.title,
      description: input.description ?? null,
      startsAt: input.startsAt,
      durationMinutes: input.durationMinutes,
      format: input.format,
      location: input.location ?? null,
      url: input.url ?? null,
    };
  }
}
