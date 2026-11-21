/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/presentation/moderation-sanctions.resolver.ts
 *
 * 🎯 Purpose:
 * Thin GraphQL transport for the private sanctions journal and M-0 commands.
 *
 * ⚠️ Important:
 * Subjects never receive issuer or revoker identities; staff journals do.
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
  Int,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from '@nestjs/graphql';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';
import { ModerationSanctionsService } from '../infrastructure/prisma-moderation-sanctions';
import { ModerationSanctionError } from '../domain/errors/moderation-sanction.error';
import {
  MODERATION_SANCTION_KINDS,
  MODERATION_SANCTION_ORIGINS,
  type ModerationJournalPage,
  type ModerationSanctionKind,
  type ModerationSanctionOrigin,
  type ModerationSanctionRecord,
} from '../domain/types/moderation-sanction.type';

const KindEnum = Object.fromEntries(
  MODERATION_SANCTION_KINDS.map((kind) => [kind, kind]),
) as Record<ModerationSanctionKind, ModerationSanctionKind>;
const OriginEnum = Object.fromEntries(
  MODERATION_SANCTION_ORIGINS.map((origin) => [origin, origin]),
) as Record<ModerationSanctionOrigin, ModerationSanctionOrigin>;
registerEnumType(KindEnum, { name: 'ModerationSanctionKind' });
registerEnumType(OriginEnum, { name: 'ModerationSanctionOrigin' });

@InputType()
class ModerationSanctionContextInput {
  @Field() @IsString() type!: string;
  @Field() @IsString() id!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  path?: string | null;
}

@InputType()
class IssueModerationWarningInput {
  @Field(() => ID) @IsString() subjectId!: string;
  @Field() @IsString() reason!: string;
  @Field(() => ModerationSanctionContextInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ModerationSanctionContextInput)
  context?: ModerationSanctionContextInput | null;
}

@InputType()
class IssueModerationReadOnlyInput extends IssueModerationWarningInput {
  @Field() @Type(() => Date) @IsDate() expiresAt!: Date;
}

@InputType()
class RevokeModerationSanctionInput {
  @Field(() => ID) @IsString() sanctionId!: string;
  @Field() @IsString() reason!: string;
}

@InputType()
class ModerationSanctionPolicyInput {
  @Field(() => Int) @IsInt() @Min(1) @Max(365) warningLifetimeDays!: number;
  @Field(() => Int) @IsInt() @Min(2) @Max(20) escalationWarningCount!: number;
  @Field(() => Int) @IsInt() @Min(1) @Max(365) escalationReadOnlyDays!: number;
  @Field(() => Int) @IsInt() @Min(1) @Max(3650) readOnlyMaxDays!: number;
}

@ObjectType()
class ModerationSanctionContext {
  @Field() type!: string;
  @Field() id!: string;
  @Field(() => String, { nullable: true }) path!: string | null;
}

@ObjectType()
class ViewerSanction {
  @Field(() => ID) id!: string;
  @Field(() => KindEnum) kind!: ModerationSanctionKind;
  @Field(() => OriginEnum) origin!: ModerationSanctionOrigin;
  @Field() reason!: string;
  @Field(() => ModerationSanctionContext, { nullable: true })
  context!: ModerationSanctionContext | null;
  @Field() issuedAt!: Date;
  @Field() expiresAt!: Date;
  @Field() active!: boolean;
  @Field(() => Date, { nullable: true }) revokedAt!: Date | null;
  @Field(() => String, { nullable: true }) revokeReason!: string | null;
  @Field(() => Date, { nullable: true }) consumedAt!: Date | null;
}

@ObjectType()
class StaffSanction extends ViewerSanction {
  @Field(() => ID) subjectId!: string;
  @Field(() => ID, { nullable: true }) issuerId!: string | null;
  @Field(() => ID, { nullable: true }) revokedById!: string | null;
  @Field(() => ID, { nullable: true }) consumedBySanctionId!: string | null;
}

@ObjectType()
class ViewerSanctionJournal {
  @Field(() => [ViewerSanction]) items!: ViewerSanction[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) limit!: number;
}

@ObjectType()
class StaffSanctionJournal {
  @Field(() => [StaffSanction]) items!: StaffSanction[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) limit!: number;
}

@ObjectType()
class ModerationSanctionStatus {
  @Field(() => Date, { nullable: true }) readOnlyUntil!: Date | null;
  @Field(() => Int) activeWarnings!: number;
}

@ObjectType()
class ModerationSanctionReceipt {
  @Field(() => ID) sanctionId!: string;
  @Field(() => ID, { nullable: true }) escalatedSanctionId!: string | null;
}

@ObjectType()
class ModerationSanctionPolicy {
  @Field(() => Int) warningLifetimeDays!: number;
  @Field(() => Int) escalationWarningCount!: number;
  @Field(() => Int) escalationReadOnlyDays!: number;
  @Field(() => Int) readOnlyMaxDays!: number;
}

@Resolver()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ModerationSanctionsResolver {
  constructor(private readonly sanctions: ModerationSanctionsService) {}

  @Query(() => ModerationSanctionStatus)
  viewerSanctionStatus(@AuthUser() viewer: AuthenticatedUser) {
    return this.execute(this.sanctions.status(viewer.id));
  }

  @Query(() => ViewerSanctionJournal)
  async viewerSanctionJournal(
    @AuthUser() viewer: AuthenticatedUser,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<ViewerSanctionJournal> {
    const journal = await this.execute(
      this.sanctions.journal(viewer.id, page, limit),
    );
    return this.page(journal, (item) => this.viewerItem(item));
  }

  @Query(() => StaffSanctionJournal)
  @RequirePermissions(Permission.ModerationSanctionsView)
  async moderationSanctionJournal(
    @AuthUser() actor: AuthenticatedUser,
    @Args('subjectId', { type: () => ID }) subjectId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<StaffSanctionJournal> {
    const journal = await this.execute(
      this.sanctions.journalForStaff(actor, subjectId, page, limit),
    );
    return this.page(journal, (item) => this.staffItem(item));
  }

  @Query(() => ModerationSanctionStatus)
  @RequirePermissions(Permission.ModerationSanctionsView)
  moderationSanctionStatus(
    @Args('subjectId', { type: () => ID }) subjectId: string,
  ) {
    return this.execute(this.sanctions.status(subjectId));
  }

  @Query(() => ModerationSanctionPolicy)
  @RequirePermissions(Permission.ModerationSanctionsView)
  moderationSanctionPolicy() {
    return this.execute(this.sanctions.policy());
  }

  @Mutation(() => ModerationSanctionReceipt)
  @RequirePermissions(Permission.ModerationWarningsIssue)
  issueModerationWarning(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: IssueModerationWarningInput,
  ) {
    return this.execute(
      this.sanctions.issueWarning(actor, {
        subjectId: input.subjectId,
        reason: input.reason,
        context: input.context ?? null,
      }),
    );
  }

  @Mutation(() => ModerationSanctionReceipt)
  @RequirePermissions(Permission.ModerationReadOnlyIssue)
  issueModerationReadOnly(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: IssueModerationReadOnlyInput,
  ) {
    return this.execute(
      this.sanctions.issueReadOnly(actor, {
        subjectId: input.subjectId,
        reason: input.reason,
        context: input.context ?? null,
        expiresAt: input.expiresAt,
      }),
    );
  }

  @Mutation(() => StaffSanction)
  @RequirePermissions(Permission.ModerationSanctionsRevoke)
  async revokeModerationSanction(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: RevokeModerationSanctionInput,
  ): Promise<StaffSanction> {
    const revoked = await this.execute(
      this.sanctions.revoke(actor, {
        sanctionId: input.sanctionId,
        reason: input.reason,
      }),
    );
    return this.staffItem(revoked);
  }

  @Mutation(() => ModerationSanctionPolicy)
  @RequirePermissions(Permission.ModerationPolicyManage)
  updateModerationSanctionPolicy(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ModerationSanctionPolicyInput,
  ) {
    return this.execute(this.sanctions.updatePolicy(actor, { ...input }));
  }

  private viewerItem(
    item: ModerationSanctionRecord,
    at = new Date(),
  ): ViewerSanction {
    return {
      id: item.id,
      kind: item.kind,
      origin: item.origin,
      reason: item.reason,
      context: item.context,
      issuedAt: item.issuedAt,
      expiresAt: item.expiresAt,
      active: item.revokedAt === null && item.expiresAt > at,
      revokedAt: item.revokedAt,
      revokeReason: item.revokeReason,
      consumedAt: item.consumedAt,
    };
  }

  private staffItem(item: ModerationSanctionRecord): StaffSanction {
    return {
      ...this.viewerItem(item),
      subjectId: item.subjectId,
      issuerId: item.issuerId,
      revokedById: item.revokedById,
      consumedBySanctionId: item.consumedBySanctionId,
    };
  }

  private page<T>(
    journal: ModerationJournalPage,
    map: (item: ModerationSanctionRecord) => T,
  ) {
    return {
      items: journal.items.map(map),
      total: journal.total,
      page: journal.page,
      limit: journal.limit,
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
