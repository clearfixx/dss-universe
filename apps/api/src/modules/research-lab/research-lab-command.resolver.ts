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
  ObjectType,
  Resolver,
} from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { ResearchLabService } from './infrastructure/prisma-research-lab-workflow';
import { ResearchLabCommandError } from './domain/errors/research-lab-command.error';

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
