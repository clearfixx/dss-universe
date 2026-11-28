/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/presentation/account-bans.resolver.ts
 *
 * 🎯 Purpose:
 * GraphQL for permanent bans: administrator commands and the ban notice.
 *
 * ⚠️ Important:
 * `accountBanNotice` has no session guard on purpose: a banned account has
 * no session. The ban ticket from login is verified by the service.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  NotFoundException,
  Optional,
  UseGuards,
} from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';
import {
  MODERATION_MEMBER_CARDS,
  type ModerationMemberCardReader,
} from '../contracts/moderation-member-cards.contract';
import { ModerationSanctionError } from '../domain/errors/moderation-sanction.error';
import type { AccountBanRecord } from '../domain/types/account-ban.type';
import { AccountBansService } from '../infrastructure/prisma-account-ban-records';

@InputType()
class AccountBanContextInput {
  @Field() @IsString() @MaxLength(100) type!: string;
  @Field() @IsString() @MaxLength(100) id!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string | null;
}

@InputType()
class IssueAccountBanInput {
  @Field(() => ID) @IsString() @MaxLength(100) subjectId!: string;
  @Field(() => ID) @IsString() @MaxLength(100) ruleId!: string;
  @Field() @IsString() @MaxLength(2000) comment!: string;
  @Field(() => AccountBanContextInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccountBanContextInput)
  context?: AccountBanContextInput | null;
}

@ObjectType('AccountBan')
class AccountBanModel {
  @Field(() => ID) id!: string;
  @Field() reference!: string;
  @Field(() => ID) subjectId!: string;
  @Field(() => ID) issuerId!: string;
  @Field() ruleCode!: string;
  @Field() ruleText!: string;
  @Field() comment!: string;
  @Field(() => String, { nullable: true }) contextPath!: string | null;
  @Field() issuedAt!: Date;
  @Field(() => Date, { nullable: true }) liftedAt!: Date | null;
  @Field(() => ID, { nullable: true }) liftedById!: string | null;
  @Field(() => String, { nullable: true }) liftReason!: string | null;
}

@ObjectType('AccountBanNotice', {
  description: 'What a banned person sees about their own ban.',
})
class AccountBanNoticeModel {
  @Field() reference!: string;
  @Field() issuedAt!: Date;
  @Field(() => String, { nullable: true }) issuedByName!: string | null;
  @Field() ruleCode!: string;
  @Field() ruleText!: string;
  @Field() comment!: string;
  @Field(() => String, {
    nullable: true,
    description: 'Where the violation happened.',
  })
  contextPath!: string | null;
}

@ObjectType('AccountBanRule')
class AccountBanRuleModel {
  @Field(() => ID) id!: string;
  @Field() code!: string;
  @Field() text!: string;
}

@ObjectType('AccountBanListItem')
class AccountBanListItemModel extends AccountBanModel {
  @Field(() => String, { nullable: true }) subjectName!: string | null;
  @Field(() => String, { nullable: true }) issuedByName!: string | null;
}

@ObjectType('AccountBanList')
class AccountBanListModel {
  @Field(() => [AccountBanListItemModel]) items!: AccountBanListItemModel[];
  @Field(() => Int) total!: number;
}

@Resolver()
export class AccountBansResolver {
  constructor(
    private readonly bans: AccountBansService,
    @Optional()
    @Inject(MODERATION_MEMBER_CARDS)
    private readonly members?: ModerationMemberCardReader,
  ) {}

  @Query(() => AccountBanNoticeModel)
  async accountBanNotice(
    @Args('ticket') ticket: string,
  ): Promise<AccountBanNoticeModel> {
    const ban = await this.execute(this.bans.notice(ticket));
    return this.notice(ban);
  }

  @Query(() => [AccountBanRuleModel], {
    description: 'Rules in force; only for those who may ban accounts.',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ModerationBansManage)
  accountBanRules(@AuthUser() actor: AuthenticatedUser) {
    return this.execute(this.bans.banRules(actor));
  }

  @Query(() => AccountBanListModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ModerationBansManage)
  async accountBans(
    @AuthUser() actor: AuthenticatedUser,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<AccountBanListModel> {
    const list = await this.execute(this.bans.inForceList(actor, page, limit));
    const ids = list.items.flatMap((ban) => [ban.subjectId, ban.issuerId]);
    const cards = new Map(
      (this.members ? await this.members.cards([...new Set(ids)]) : []).map(
        (card) => [card.id, card],
      ),
    );
    const name = (id: string) => {
      const card = cards.get(id);
      return card?.displayName || card?.username || null;
    };
    return {
      total: list.total,
      items: list.items.map((ban) => ({
        ...ban,
        subjectName: name(ban.subjectId),
        issuedByName: name(ban.issuerId),
      })),
    };
  }

  @Query(() => AccountBanModel, { nullable: true })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ModerationBansManage)
  activeAccountBan(
    @AuthUser() actor: AuthenticatedUser,
    @Args('subjectId', { type: () => ID }) subjectId: string,
  ) {
    return this.execute(this.bans.activeBan(actor, subjectId));
  }

  @Mutation(() => AccountBanModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ModerationBansManage)
  issueAccountBan(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: IssueAccountBanInput,
  ) {
    return this.execute(
      this.bans.issue(actor, {
        subjectId: input.subjectId,
        ruleId: input.ruleId,
        comment: input.comment,
        context: input.context ?? null,
      }),
    );
  }

  @Mutation(() => AccountBanModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ModerationBansManage)
  liftAccountBan(
    @AuthUser() actor: AuthenticatedUser,
    @Args('banId', { type: () => ID }) banId: string,
    @Args('reason') reason: string,
  ) {
    return this.execute(this.bans.lift(actor, banId, reason));
  }

  private async notice(ban: AccountBanRecord): Promise<AccountBanNoticeModel> {
    const [issuer] = this.members
      ? await this.members.cards([ban.issuerId])
      : [];
    return {
      reference: ban.reference,
      issuedAt: ban.issuedAt,
      issuedByName: issuer?.displayName || issuer?.username || null,
      ruleCode: ban.ruleCode,
      ruleText: ban.ruleText,
      comment: ban.comment,
      contextPath: ban.contextPath,
    };
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
