import { randomUUID } from 'node:crypto';
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
  Query,
  registerEnumType,
  ObjectType,
  Resolver,
} from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { ResearchLabService } from './infrastructure/prisma-research-lab-workflow';
import { ResearchLabCommandError } from './domain/errors/research-lab-command.error';

enum ResearchEditProtection {
  OPEN = 'OPEN',
  TRUSTED = 'TRUSTED',
  GUARDIAN_ONLY = 'GUARDIAN_ONLY',
  LOCKED = 'LOCKED',
}
registerEnumType(ResearchEditProtection, { name: 'ResearchEditProtection' });

@ObjectType()
class ResearchEditPolicy {
  @Field(() => ResearchEditProtection) protectionLevel!: ResearchEditProtection;
  @Field(() => [String]) trustedEditGroupKeys!: string[];
}

@InputType()
class ResearchDraftInput {
  @Field() @IsString() title!: string;
  @Field() @IsString() summary!: string;
  @Field() @IsString() proposedSlug!: string;
  @Field() @IsString() documentJson!: string;
}
@InputType()
class ResearchSaveDraftInput extends ResearchDraftInput {
  @Field(() => ID) @IsString() pageId!: string;
  @Field(() => Int) @IsInt() @Min(1) expectedVersion!: number;
}
@InputType()
class ResearchSubmitInput {
  @Field(() => ID) @IsString() pageId!: string;
  @Field(() => Int) @IsInt() @Min(1) expectedVersion!: number;
  @Field() @IsString() editSummary!: string;
}
@InputType()
class ResearchDecisionInput {
  @Field(() => ID) @IsString() pageId!: string;
  @Field(() => ID) @IsString() revisionId!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;
}
@InputType()
class ResearchLifecycleInput {
  @Field(() => ID) @IsString() pageId!: string;
  @Field(() => Int) @IsInt() @Min(1) expectedPublicationGeneration!: number;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reason?: string;
}
@InputType()
class ResearchRollbackInput extends ResearchLifecycleInput {
  @Field(() => ID) @IsString() revisionId!: string;
}
@ObjectType()
class ResearchReviewItem {
  @Field(() => ID) id!: string;
  @Field(() => ID) pageId!: string;
  @Field(() => Int) number!: number;
  @Field() createdAt!: Date;
}
@ObjectType()
class ResearchPendingRevision {
  @Field(() => ID) id!: string;
  @Field(() => ID) pageId!: string;
  @Field(() => Int) number!: number;
  @Field() title!: string;
  @Field() summary!: string;
  @Field() editSummary!: string;
  @Field() documentJson!: string;
}
@ObjectType()
class ResearchOwnDraftItem {
  @Field(() => ID) id!: string;
  @Field(() => ID) pageId!: string;
  @Field(() => Int) version!: number;
  @Field() updatedAt!: Date;
}
@ObjectType()
class ResearchOwnDraft extends ResearchOwnDraftItem {
  @Field() title!: string;
  @Field() summary!: string;
  @Field() proposedSlug!: string;
  @Field() documentJson!: string;
  @Field(() => ID, { nullable: true }) basePublishedRevisionId!: string | null;
}
@ObjectType()
class ResearchDraftReceipt {
  @Field(() => ID) pageId!: string;
  @Field(() => ID) draftId!: string;
  @Field(() => Int) version!: number;
}
@ObjectType()
class ResearchRevisionReceipt {
  @Field(() => ID) pageId!: string;
  @Field(() => ID) revisionId!: string;
  @Field(() => Int) number!: number;
  @Field() state!: string;
}
@Resolver()
@UseGuards(JwtAuthGuard)
export class ResearchLabCommandResolver {
  constructor(private readonly workflow: ResearchLabService) {}
  private async execute<T>(operation: Promise<T>): Promise<T> {
    try {
      return await operation;
    } catch (error) {
      if (!(error instanceof ResearchLabCommandError)) throw error;
      switch (error.code) {
        case 'ACCESS_DENIED':
          throw new ForbiddenException(error.message);
        case 'NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'INVALID_STATE':
          throw new BadRequestException(error.message);
        case 'REVISION_CONFLICT':
        case 'DRAFT_CONFLICT':
          throw new ConflictException(error.message);
      }
    }
  }
  @Query(() => [ResearchOwnDraftItem])
  researchOwnDrafts(
    @AuthUser() actor: AuthenticatedUser,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @Args('limit', { type: () => Int, defaultValue: 50 }) limit: number,
  ) {
    if (offset < 0 || limit < 1 || limit > 100)
      throw new BadRequestException('Invalid draft pagination.');
    return this.execute(this.workflow.ownDrafts(actor.id, offset, limit));
  }

  @Query(() => ResearchOwnDraft, { nullable: true })
  async researchOwnDraft(
    @AuthUser() actor: AuthenticatedUser,
    @Args('pageId', { type: () => ID }) pageId: string,
  ) {
    const draft = await this.execute(this.workflow.ownDraft(actor.id, pageId));
    if (!draft) return null;
    return {
      id: draft.id,
      pageId,
      version: draft.version,
      updatedAt: draft.updatedAt,
      title: draft.title,
      summary: draft.summary,
      proposedSlug: draft.proposedSlug,
      basePublishedRevisionId: draft.basePublishedRevisionId,
      documentJson: JSON.stringify(draft.document),
    };
  }

  @Query(() => [ResearchReviewItem])
  researchReviewQueue(
    @AuthUser() actor: AuthenticatedUser,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @Args('limit', { type: () => Int, defaultValue: 50 }) limit: number,
  ) {
    if (offset < 0 || limit < 1 || limit > 100)
      throw new BadRequestException('Invalid review pagination.');
    return this.execute(this.workflow.reviewQueue(actor.id, offset, limit));
  }
  @Query(() => ResearchPendingRevision, { nullable: true })
  researchPendingRevision(
    @AuthUser() actor: AuthenticatedUser,
    @Args('pageId', { type: () => ID }) pageId: string,
    @Args('revisionId', { type: () => ID }) revisionId: string,
  ) {
    return this.execute(
      this.workflow.reviewRevision(actor.id, pageId, revisionId),
    );
  }
  @Query(() => ResearchEditPolicy)
  researchEditPolicy(
    @AuthUser() actor: AuthenticatedUser,
    @Args('pageId', { type: () => ID }) pageId: string,
  ) {
    return this.execute(this.workflow.editPolicy(actor.id, pageId));
  }
  @Mutation(() => ResearchEditPolicy)
  setResearchEditProtection(
    @AuthUser() actor: AuthenticatedUser,
    @Args('pageId', { type: () => ID }) pageId: string,
    @Args('level', { type: () => ResearchEditProtection })
    level: ResearchEditProtection,
  ) {
    return this.execute(
      this.workflow.setEditProtection(actor.id, pageId, level),
    );
  }
  @Mutation(() => [String])
  setResearchTrustedEditors(
    @AuthUser() actor: AuthenticatedUser,
    @Args('pageId', { type: () => ID }) pageId: string,
    @Args('groupKeys', { type: () => [String] }) groupKeys: string[],
  ) {
    return this.execute(
      this.workflow.setTrustedEditors(actor.id, pageId, groupKeys),
    );
  }

  @Mutation(() => ResearchDraftReceipt)
  startResearchDraft(
    @AuthUser() actor: AuthenticatedUser,
    @Args('pageId', { type: () => ID }) pageId: string,
  ) {
    return this.execute(this.workflow.startDraft(actor.id, pageId));
  }
  @Mutation(() => ResearchDraftReceipt)
  async createResearchDraft(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchDraftInput,
  ) {
    return this.execute(
      this.workflow.createDraft({ ...input, actorId: actor.id }),
    );
  }
  @Mutation(() => ResearchDraftReceipt)
  async saveResearchDraft(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchSaveDraftInput,
  ) {
    return this.execute(
      this.workflow.saveDraft({ ...input, actorId: actor.id }),
    );
  }
  @Mutation(() => ResearchRevisionReceipt)
  async submitResearchDraft(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchSubmitInput,
  ) {
    return this.execute(
      this.workflow.submitDraft({
        ...input,
        actorId: actor.id,
        correlationId: randomUUID(),
      }),
    );
  }
  @Mutation(() => ResearchRevisionReceipt)
  async selfPublishResearchDraft(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchSubmitInput,
  ) {
    return this.execute(
      this.workflow.selfPublishDraft({
        ...input,
        actorId: actor.id,
        correlationId: randomUUID(),
      }),
    );
  }
  @Mutation(() => ResearchRevisionReceipt)
  async publishResearchRevision(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchDecisionInput,
  ) {
    return this.execute(
      this.workflow.publishRevision({
        ...input,
        actorId: actor.id,
        correlationId: randomUUID(),
      }),
    );
  }
  @Mutation(() => ResearchRevisionReceipt)
  async rejectResearchRevision(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchDecisionInput,
  ) {
    return this.execute(
      this.workflow.rejectRevision({
        ...input,
        actorId: actor.id,
        correlationId: randomUUID(),
      }),
    );
  }
  @Mutation(() => ResearchRevisionReceipt)
  async withdrawResearchRevision(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchDecisionInput,
  ) {
    return this.execute(
      this.workflow.withdrawRevision({
        ...input,
        actorId: actor.id,
        correlationId: randomUUID(),
      }),
    );
  }
  @Mutation(() => ResearchRevisionReceipt)
  async requestResearchChanges(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchDecisionInput,
  ) {
    return this.execute(
      this.workflow.requestChanges({
        ...input,
        actorId: actor.id,
        correlationId: randomUUID(),
      }),
    );
  }
  @Mutation(() => ResearchRevisionReceipt)
  async rollbackResearchPage(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchRollbackInput,
  ) {
    return this.execute(
      this.workflow.rollback({
        ...input,
        actorId: actor.id,
        correlationId: randomUUID(),
      }),
    );
  }
  @Mutation(() => Boolean)
  async archiveResearchPage(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchLifecycleInput,
  ) {
    await this.execute(
      this.workflow.archive({
        ...input,
        actorId: actor.id,
        correlationId: randomUUID(),
      }),
    );
    return true;
  }
  @Mutation(() => Boolean)
  async restoreResearchPage(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchLifecycleInput,
  ) {
    await this.execute(
      this.workflow.restore({
        ...input,
        actorId: actor.id,
        correlationId: randomUUID(),
      }),
    );
    return true;
  }
  @Mutation(() => Boolean)
  async tombstoneResearchPage(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ResearchLifecycleInput,
  ) {
    await this.execute(
      this.workflow.tombstone({
        ...input,
        actorId: actor.id,
        correlationId: randomUUID(),
      }),
    );
    return true;
  }
}
