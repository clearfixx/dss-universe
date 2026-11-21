/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/presentation/forum-structure.resolver.ts
 *
 * 🎯 Purpose:
 * Thin GraphQL transport for the forum structure and category moderators.
 *
 * ⚠️ Important:
 * Audience entries are returned only to structure managers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
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
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { OptionalViewerJwtGuard } from '@api/core/auth/guards/optional-viewer-jwt.guard';
import { ForumStructureService } from '../infrastructure/prisma-forum-structure';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import {
  FORUM_VISIBILITIES,
  type ForumCategoryNode,
  type ForumNode,
  type ForumVisibility,
} from '../domain/types/forum-structure.type';

const ForumVisibilityEnum = Object.fromEntries(
  FORUM_VISIBILITIES.map((value) => [value, value]),
) as Record<ForumVisibility, ForumVisibility>;
registerEnumType(ForumVisibilityEnum, { name: 'ForumVisibility' });

@InputType()
class ForumCategoryInput {
  @Field() @IsString() slug!: string;
  @Field() @IsString() title!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;
  @Field(() => Int, { defaultValue: 0 }) @IsInt() @Min(0) position!: number;
  @Field(() => ForumVisibilityEnum) visibility!: ForumVisibility;
  @Field(() => [String], { defaultValue: [] })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  audienceKeys!: string[];
  @Field({ defaultValue: true }) @IsBoolean() active!: boolean;
}

@InputType()
class ForumInput {
  @Field(() => ID) @IsString() categoryId!: string;
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string | null;
  @Field() @IsString() slug!: string;
  @Field() @IsString() title!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;
  @Field(() => Int, { defaultValue: 0 }) @IsInt() @Min(0) position!: number;
  @Field({ defaultValue: false }) @IsBoolean() allowsGatedContent!: boolean;
  @Field({ defaultValue: true }) @IsBoolean() active!: boolean;
}

@ObjectType('ForumSubforum')
class ForumSubforumModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) categoryId!: string;
  @Field(() => ID, { nullable: true }) parentId!: string | null;
  @Field() slug!: string;
  @Field() title!: string;
  @Field(() => String, { nullable: true }) description!: string | null;
  @Field(() => Int) position!: number;
  @Field() active!: boolean;
  @Field() allowsGatedContent!: boolean;
}

@ObjectType('Forum')
class ForumModel extends ForumSubforumModel {
  @Field(() => [ForumSubforumModel]) subforums!: ForumSubforumModel[];
}

@ObjectType('ForumCategory')
class ForumCategoryModel {
  @Field(() => ID) id!: string;
  @Field() slug!: string;
  @Field() title!: string;
  @Field(() => String, { nullable: true }) description!: string | null;
  @Field(() => Int) position!: number;
  @Field() active!: boolean;
  @Field(() => ForumVisibilityEnum) visibility!: ForumVisibility;
  @Field(() => [String], {
    nullable: true,
    description: 'Visible to structure managers only.',
  })
  audienceKeys!: string[] | null;
  @Field(() => [ForumModel]) forums!: ForumModel[];
}

@ObjectType('ForumModeratorAssignment')
class ForumModeratorAssignmentModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) categoryId!: string;
  @Field(() => ID) moderatorId!: string;
  @Field() assignedAt!: Date;
  @Field(() => Date, { nullable: true }) revokedAt!: Date | null;
}

type RequestContext = { req: { user?: AuthenticatedUser } };

@Resolver()
export class ForumStructureResolver {
  constructor(private readonly structure: ForumStructureService) {}

  @Query(() => [ForumCategoryModel])
  @UseGuards(OptionalViewerJwtGuard)
  forumCategories(@Context() ctx: RequestContext) {
    return this.execute(
      this.structure
        .visibleTree(ctx.req.user?.id ?? null)
        .then((tree) => tree.map((category) => this.category(category))),
    );
  }

  @Query(() => [ForumModeratorAssignmentModel])
  @UseGuards(OptionalViewerJwtGuard)
  forumCategoryModerators(
    @Context() ctx: RequestContext,
    @Args('categoryId', { type: () => ID }) categoryId: string,
  ) {
    return this.execute(
      this.structure.moderators(ctx.req.user?.id ?? null, categoryId),
    );
  }

  @Mutation(() => ForumCategoryModel)
  @UseGuards(JwtAuthGuard)
  async createForumCategory(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ForumCategoryInput,
  ) {
    return this.category(
      await this.execute(
        this.structure.createCategory(actor.id, this.categoryInput(input)),
      ),
    );
  }

  @Mutation(() => ForumCategoryModel)
  @UseGuards(JwtAuthGuard)
  async updateForumCategory(
    @AuthUser() actor: AuthenticatedUser,
    @Args('categoryId', { type: () => ID }) categoryId: string,
    @Args('input') input: ForumCategoryInput,
  ) {
    return this.category(
      await this.execute(
        this.structure.updateCategory(
          actor.id,
          categoryId,
          this.categoryInput(input),
        ),
      ),
    );
  }

  @Mutation(() => ForumModel)
  @UseGuards(JwtAuthGuard)
  async createForum(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ForumInput,
  ) {
    return this.forum(
      await this.execute(
        this.structure.createForum(actor.id, this.forumInput(input)),
      ),
    );
  }

  @Mutation(() => ForumModel)
  @UseGuards(JwtAuthGuard)
  async updateForum(
    @AuthUser() actor: AuthenticatedUser,
    @Args('forumId', { type: () => ID }) forumId: string,
    @Args('input') input: ForumInput,
  ) {
    return this.forum(
      await this.execute(
        this.structure.updateForum(actor.id, forumId, this.forumInput(input)),
      ),
    );
  }

  @Mutation(() => ForumModeratorAssignmentModel)
  @UseGuards(JwtAuthGuard)
  assignForumCategoryModerator(
    @AuthUser() actor: AuthenticatedUser,
    @Args('categoryId', { type: () => ID }) categoryId: string,
    @Args('moderatorId', { type: () => ID }) moderatorId: string,
  ) {
    return this.execute(
      this.structure.assignModerator(actor.id, categoryId, moderatorId),
    );
  }

  @Mutation(() => ForumModeratorAssignmentModel)
  @UseGuards(JwtAuthGuard)
  revokeForumCategoryModerator(
    @AuthUser() actor: AuthenticatedUser,
    @Args('assignmentId', { type: () => ID }) assignmentId: string,
  ) {
    return this.execute(this.structure.revokeModerator(actor.id, assignmentId));
  }

  private categoryInput(input: ForumCategoryInput) {
    return {
      slug: input.slug,
      title: input.title,
      description: input.description ?? null,
      position: input.position,
      visibility: input.visibility,
      audienceKeys: input.audienceKeys,
      active: input.active,
    };
  }

  private forumInput(input: ForumInput) {
    return {
      categoryId: input.categoryId,
      parentId: input.parentId ?? null,
      slug: input.slug,
      title: input.title,
      description: input.description ?? null,
      position: input.position,
      allowsGatedContent: input.allowsGatedContent,
      active: input.active,
    };
  }

  private category(node: ForumCategoryNode): ForumCategoryModel {
    return { ...node, forums: node.forums.map((forum) => this.forum(forum)) };
  }

  private forum(node: ForumNode): ForumModel {
    const { subforums, ...rest } = node;
    return {
      ...rest,
      subforums: subforums.map((child) => ({
        id: child.id,
        categoryId: child.categoryId,
        parentId: child.parentId,
        slug: child.slug,
        title: child.title,
        description: child.description,
        position: child.position,
        active: child.active,
        allowsGatedContent: child.allowsGatedContent,
      })),
    };
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
        case 'CONFLICT':
          throw new ConflictException(error.message);
        case 'RATE_LIMITED':
          throw new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS);
      }
    }
  }
}
