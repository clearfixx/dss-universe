/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/presentation/ban-appeals.resolver.ts
 *
 * 🎯 Purpose:
 * GraphQL for ban appeals: the banned person's side (ticket) and review.
 *
 * ⚠️ Important:
 * The ticket operations have no session guard on purpose.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Optional, UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  Int,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from '@nestjs/graphql';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';
import {
  MODERATION_MEMBER_CARDS,
  type ModerationMemberCard,
  type ModerationMemberCardReader,
} from '../contracts/moderation-member-cards.contract';
import type { BanAppealStatus } from '../domain/ban-appeal.rules';
import { BanAppealsService } from '../infrastructure/prisma-ban-appeals';
import { moderationFailure } from './moderation-failure';

const StatusEnum = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
} as const;
registerEnumType(StatusEnum, { name: 'BanAppealStatus' });

const FileStatusEnum = {
  CHECKING: 'CHECKING',
  READY: 'READY',
  REJECTED: 'REJECTED',
} as const;
registerEnumType(FileStatusEnum, { name: 'BanAppealFileStatus' });

@ObjectType('BanAppealFile')
class BanAppealFileModel {
  @Field(() => ID) id!: string;
  @Field() filename!: string;
  @Field(() => Int) size!: number;
  @Field(() => FileStatusEnum) status!: keyof typeof FileStatusEnum;
}

@ObjectType('BanAppeal')
class BanAppealModel {
  @Field(() => ID) id!: string;
  @Field() text!: string;
  @Field(() => StatusEnum) status!: BanAppealStatus;
  @Field() submittedAt!: Date;
  @Field(() => Date, { nullable: true }) decidedAt!: Date | null;
  @Field(() => String, { nullable: true }) decisionReason!: string | null;
}

@ObjectType('BanAppealState')
class BanAppealStateModel {
  @Field(() => BanAppealModel, { nullable: true })
  appeal!: BanAppealModel | null;
  @Field(() => [BanAppealFileModel]) files!: BanAppealFileModel[];
}

@ObjectType('ReviewedBanAppeal')
class ReviewedBanAppealModel extends BanAppealModel {
  @Field() reference!: string;
  @Field(() => ID) subjectId!: string;
  @Field(() => String, { nullable: true }) subjectName!: string | null;
  @Field(() => String, { nullable: true }) subjectUsername!: string | null;
  @Field(() => String, { nullable: true }) issuedByName!: string | null;
  @Field(() => String, { nullable: true }) decidedByName!: string | null;
  @Field() bannedAt!: Date;
  @Field() ruleCode!: string;
  @Field() ruleText!: string;
  @Field() banComment!: string;
  @Field(() => String, { nullable: true }) contextPath!: string | null;
  @Field(() => [BanAppealFileModel]) files!: BanAppealFileModel[];
}

@ObjectType('BanAppealQueue')
class BanAppealQueueModel {
  @Field(() => [ReviewedBanAppealModel]) items!: ReviewedBanAppealModel[];
  @Field(() => Int) total!: number;
}

@ObjectType('BanAppealFileAccess')
class BanAppealFileAccessModel {
  @Field() url!: string;
  @Field() expiresAt!: Date;
}

@Resolver()
export class BanAppealsResolver {
  constructor(
    private readonly appeals: BanAppealsService,
    @Optional()
    @Inject(MODERATION_MEMBER_CARDS)
    private readonly members?: ModerationMemberCardReader,
  ) {}

  @Query(() => BanAppealStateModel)
  banAppealState(@Args('ticket') ticket: string) {
    return this.execute(this.appeals.state(ticket));
  }

  @Mutation(() => Boolean)
  removeBanAppealFile(
    @Args('ticket') ticket: string,
    @Args('fileId', { type: () => ID }) fileId: string,
  ) {
    return this.execute(this.appeals.removeFile(ticket, fileId));
  }

  @Mutation(() => BanAppealModel)
  submitBanAppeal(@Args('ticket') ticket: string, @Args('text') text: string) {
    return this.execute(this.appeals.submit(ticket, text));
  }

  @Query(() => BanAppealQueueModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ModerationBansManage)
  async banAppeals(
    @AuthUser() actor: AuthenticatedUser,
    @Args('status', { type: () => StatusEnum }) status: BanAppealStatus,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<BanAppealQueueModel> {
    const queue = await this.execute(
      this.appeals.queue(actor, status, page, limit),
    );
    const ids = queue.items.flatMap((item) => [
      item.ban.subjectId,
      item.ban.issuerId,
      ...(item.decidedById ? [item.decidedById] : []),
    ]);
    const cards = new Map<string, ModerationMemberCard>(
      (this.members ? await this.members.cards([...new Set(ids)]) : []).map(
        (card) => [card.id, card],
      ),
    );
    const name = (id: string | null) => {
      const card = id ? cards.get(id) : undefined;
      return card?.displayName || card?.username || null;
    };
    return {
      total: queue.total,
      items: queue.items.map(({ ban, ...appeal }) => ({
        ...appeal,
        reference: ban.reference,
        subjectId: ban.subjectId,
        subjectName: name(ban.subjectId),
        subjectUsername: cards.get(ban.subjectId)?.username ?? null,
        issuedByName: name(ban.issuerId),
        decidedByName: name(appeal.decidedById),
        bannedAt: ban.issuedAt,
        ruleCode: ban.ruleCode,
        ruleText: ban.ruleText,
        banComment: ban.comment,
        contextPath: ban.contextPath,
      })),
    };
  }

  @Query(() => BanAppealFileAccessModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ModerationBansManage)
  banAppealFileAccess(
    @AuthUser() actor: AuthenticatedUser,
    @Args('appealId', { type: () => ID }) appealId: string,
    @Args('fileId', { type: () => ID }) fileId: string,
  ) {
    return this.execute(this.appeals.fileAccess(actor, appealId, fileId));
  }

  @Mutation(() => BanAppealModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ModerationBansManage)
  decideBanAppeal(
    @AuthUser() actor: AuthenticatedUser,
    @Args('appealId', { type: () => ID }) appealId: string,
    @Args('accept') accept: boolean,
    @Args('reason') reason: string,
  ) {
    return this.execute(this.appeals.decide(actor, appealId, accept, reason));
  }

  private async execute<T>(operation: Promise<T>): Promise<T> {
    try {
      return await operation;
    } catch (error) {
      throw moderationFailure(error);
    }
  }
}
