/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/presentation/forum-post-network.resolver.ts
 *
 * 🎯 Purpose:
 * GraphQL transport for post network metadata (P1 B11): staff read of the
 * IP address and User-Agent, and their manual erasure.
 *
 * ⚠️ Important:
 * Permissions, visibility and the audit live in ForumPostNetworkService.
 * Never part of public types: ForumPost does not expose these fields.
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
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from '@nestjs/graphql';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import type { ForumDeviceKind } from '../domain/forum-network.rules';
import { ForumPostNetworkService } from '../infrastructure/prisma-forum-post-network';

const DeviceKindEnum = {
  DESKTOP: 'DESKTOP',
  MOBILE: 'MOBILE',
  TABLET: 'TABLET',
  BOT: 'BOT',
  UNKNOWN: 'UNKNOWN',
} as const satisfies Record<ForumDeviceKind, ForumDeviceKind>;
registerEnumType(DeviceKindEnum, { name: 'ForumDeviceKind' });

@ObjectType('ForumDeviceInfo')
class ForumDeviceInfoModel {
  @Field(() => DeviceKindEnum) kind!: ForumDeviceKind;
  @Field(() => String, { nullable: true }) browser!: string | null;
  @Field(() => String, { nullable: true }) os!: string | null;
}

@ObjectType('ForumPostNetwork', {
  description:
    'Staff-only network metadata of a post: where it was written from. Every read is audited.',
})
class ForumPostNetworkModel {
  @Field(() => ID) postId!: string;
  @Field(() => String, { nullable: true }) ipAddress!: string | null;
  @Field(() => String, { nullable: true }) userAgent!: string | null;
  @Field(() => ForumDeviceInfoModel) device!: ForumDeviceInfoModel;
  @Field() capturedAt!: Date;
}

@Resolver()
@UseGuards(JwtAuthGuard)
export class ForumPostNetworkResolver {
  constructor(private readonly network: ForumPostNetworkService) {}

  @Query(() => ForumPostNetworkModel, {
    nullable: true,
    description:
      'IP address and User-Agent of a post author (forum.network.view; audited). Null when nothing was stored.',
  })
  forumPostNetwork(
    @AuthUser() actor: AuthenticatedUser,
    @Args('postId', { type: () => ID }) postId: string,
  ) {
    return this.execute(this.network.read(actor.id, postId));
  }

  @Mutation(() => Boolean, {
    description:
      'Erases the stored IP address and User-Agent of a post (forum.network.delete; reason required; audited).',
  })
  deleteForumPostNetwork(
    @AuthUser() actor: AuthenticatedUser,
    @Args('postId', { type: () => ID }) postId: string,
    @Args('reason') reason: string,
  ) {
    return this.execute(this.network.erase(actor.id, postId, reason));
  }

  private async execute<T>(operation: Promise<T>): Promise<T> {
    try {
      return await operation;
    } catch (error) {
      if (!(error instanceof ForumCommandError)) throw error;
      switch (error.code) {
        case 'ACCESS_DENIED':
          throw new ForbiddenException(error.message);
        case 'NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'INVALID_INPUT':
          throw new BadRequestException(error.message);
        default:
          throw new ConflictException(error.message);
      }
    }
  }
}
