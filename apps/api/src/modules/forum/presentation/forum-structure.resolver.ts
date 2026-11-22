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
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { OptionalViewerJwtGuard } from '@api/core/auth/guards/optional-viewer-jwt.guard';
import { ForumStructureService } from '../infrastructure/prisma-forum-structure';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import {
  FORUM_ACCESS_ROLES,
  type ForumAccessMatrix,
  type ForumAccessRole,
} from '../domain/forum-access.rules';
import {
  GATE_BLOCK_TYPES,
  type GateBlockType,
} from '../domain/forum-section-limits.rules';
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
const ForumAccessRoleEnum = Object.fromEntries(
  FORUM_ACCESS_ROLES.map((value) => [value, value]),
) as Record<ForumAccessRole, ForumAccessRole>;
registerEnumType(ForumAccessRoleEnum, {
  name: 'ForumAccessRole',
  description:
    'Forum role of a viewer: GUEST (signed out), MEMBER, CONTRIBUTOR, MODERATOR, ADMIN (admin or owner).',
});
const GateBlockTypeEnum = Object.fromEntries(
  GATE_BLOCK_TYPES.map((value) => [value, value]),
) as Record<GateBlockType, GateBlockType>;
registerEnumType(GateBlockTypeEnum, {
  name: 'ForumGateBlockType',
  description: 'Content kinds allowed inside hidden blocks.',
});

@InputType()
export class ForumCategoryInput {
  @Field() @IsString() slug!: string;
  @Field() @IsString() title!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;
  @Field(() => Int, { defaultValue: 0 }) @IsInt() @Min(0) position!: number;
  @Field(() => ForumVisibilityEnum)
  @IsIn(FORUM_VISIBILITIES)
  visibility!: ForumVisibility;
  @Field(() => [String], { defaultValue: [] })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  audienceKeys!: string[];
  @Field({ defaultValue: true }) @IsBoolean() active!: boolean;
}

@InputType()
export class ForumInput {
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
  @Field({ defaultValue: true }) @IsBoolean() allowTopics!: boolean;
  @Field({ defaultValue: true }) @IsBoolean() allowReplies!: boolean;
  @Field({ defaultValue: true }) @IsBoolean() allowPolls!: boolean;
  @Field({ defaultValue: true }) @IsBoolean() allowAttachments!: boolean;
  @Field({
    defaultValue: true,
    description: 'false = unlisted: hidden from lists, opens by direct link.',
  })
  @IsBoolean()
  listed!: boolean;
  @Field({ defaultValue: true }) @IsBoolean() searchable!: boolean;
  @Field({ defaultValue: true }) @IsBoolean() showCounts!: boolean;
  @Field(() => Int, { nullable: true, description: 'Empty = no limit.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  pinnedLimit?: number | null;
  @Field(() => Int, {
    nullable: true,
    description: 'Largest attachment in MB; empty = platform limit.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1024)
  attachmentMaxMb?: number | null;
  @Field(() => [String], {
    defaultValue: [],
    description: 'Allowed extensions (pdf, zip…); empty = any.',
  })
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  attachmentFormats!: string[];
  @Field(() => Int, {
    nullable: true,
    description: 'Close open topics inactive for N days; empty = off.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  autoCloseDays?: number | null;
  @Field(() => ForumAccessRoleEnum, { defaultValue: 'GUEST' })
  @IsIn(FORUM_ACCESS_ROLES)
  gateViewRole!: ForumAccessRole;
  @Field(() => ForumAccessRoleEnum, { defaultValue: 'MEMBER' })
  @IsIn(FORUM_ACCESS_ROLES)
  gateCreateRole!: ForumAccessRole;
  @Field(() => [GateBlockTypeEnum], {
    defaultValue: ['TEXT', 'CODE', 'MEDIA', 'FILES'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(GATE_BLOCK_TYPES, { each: true })
  gateBlockTypes!: GateBlockType[];
}

@ObjectType('ForumSubforum')
export class ForumSubforumModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) categoryId!: string;
  @Field(() => ID, { nullable: true }) parentId!: string | null;
  @Field() slug!: string;
  @Field() title!: string;
  @Field(() => String, { nullable: true }) description!: string | null;
  @Field(() => Int) position!: number;
  @Field() active!: boolean;
  @Field() allowsGatedContent!: boolean;
  @Field() allowTopics!: boolean;
  @Field() allowReplies!: boolean;
  @Field() allowPolls!: boolean;
  @Field() allowAttachments!: boolean;
  @Field() listed!: boolean;
  @Field() searchable!: boolean;
  @Field() showCounts!: boolean;
  @Field(() => Int, { nullable: true }) pinnedLimit!: number | null;
  @Field(() => Int, { nullable: true }) attachmentMaxMb!: number | null;
  @Field(() => [String]) attachmentFormats!: string[];
  @Field(() => Int, { nullable: true }) autoCloseDays!: number | null;
  @Field(() => ForumAccessRoleEnum) gateViewRole!: ForumAccessRole;
  @Field(() => ForumAccessRoleEnum) gateCreateRole!: ForumAccessRole;
  @Field(() => [GateBlockTypeEnum]) gateBlockTypes!: GateBlockType[];
}

@ObjectType('Forum')
export class ForumModel extends ForumSubforumModel {
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
export class ForumModeratorAssignmentModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) categoryId!: string;
  @Field(() => ID, { nullable: true, description: 'null = whole category.' })
  forumId!: string | null;
  @Field(() => ID) moderatorId!: string;
  @Field() assignedAt!: Date;
  @Field(() => Date, { nullable: true }) revokedAt!: Date | null;
}

const AccessSourceEnum = {
  FORUM: 'FORUM',
  PARENT: 'PARENT',
  CATEGORY: 'CATEGORY',
  DEFAULT: 'DEFAULT',
} as const;
registerEnumType(AccessSourceEnum, {
  name: 'ForumAccessSource',
  description: 'Where the matrix in force comes from.',
});

@InputType()
export class ForumAccessRowInput {
  @Field(() => ForumAccessRoleEnum)
  @IsIn(FORUM_ACCESS_ROLES)
  role!: ForumAccessRole;
  @Field() @IsBoolean() view!: boolean;
  @Field() @IsBoolean() read!: boolean;
  @Field() @IsBoolean() createTopics!: boolean;
  @Field() @IsBoolean() reply!: boolean;
  @Field() @IsBoolean() editOwn!: boolean;
  @Field() @IsBoolean() deleteOwn!: boolean;
  @Field() @IsBoolean() moderate!: boolean;
}

@ObjectType('ForumAccessRow')
export class ForumAccessRowModel {
  @Field(() => ForumAccessRoleEnum) role!: ForumAccessRole;
  @Field() view!: boolean;
  @Field() read!: boolean;
  @Field() createTopics!: boolean;
  @Field() reply!: boolean;
  @Field() editOwn!: boolean;
  @Field() deleteOwn!: boolean;
  @Field() moderate!: boolean;
}

@ObjectType('ForumSectionAccess')
export class ForumSectionAccessModel {
  @Field(() => AccessSourceEnum) source!: keyof typeof AccessSourceEnum;
  @Field(() => [ForumAccessRowModel], {
    nullable: true,
    description: "The section's own matrix; null when it inherits.",
  })
  own!: ForumAccessRowModel[] | null;
  @Field(() => [ForumAccessRowModel]) effective!: ForumAccessRowModel[];
}

@InputType()
export class ForumCategoryChangeInput {
  @Field(() => ID) @IsString() id!: string;
  @Field(() => ForumCategoryInput)
  @ValidateNested()
  @Type(() => ForumCategoryInput)
  input!: ForumCategoryInput;
  @Field(() => [ForumAccessRowInput], {
    nullable: true,
    description: 'Omit to keep; [] is invalid; send resetAccess to inherit.',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ForumAccessRowInput)
  access?: ForumAccessRowInput[] | null;
  @Field({ defaultValue: false }) @IsBoolean() resetAccess!: boolean;
}

@InputType()
export class ForumChangeInput {
  @Field(() => ID) @IsString() id!: string;
  @Field(() => ForumInput)
  @ValidateNested()
  @Type(() => ForumInput)
  input!: ForumInput;
  @Field(() => [ForumAccessRowInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ForumAccessRowInput)
  access?: ForumAccessRowInput[] | null;
  @Field({ defaultValue: false }) @IsBoolean() resetAccess!: boolean;
}

@InputType()
export class SaveForumSettingsInput {
  @Field(() => [ForumCategoryChangeInput], { defaultValue: [] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ForumCategoryChangeInput)
  categories!: ForumCategoryChangeInput[];
  @Field(() => [ForumChangeInput], { defaultValue: [] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ForumChangeInput)
  forums!: ForumChangeInput[];
}

function accessRows(matrix: ForumAccessMatrix): ForumAccessRowModel[] {
  return FORUM_ACCESS_ROLES.map((role) => ({ role, ...matrix[role] }));
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

  @Mutation(() => ForumModeratorAssignmentModel, {
    description: 'Assign a moderator to one forum (and its subforums).',
  })
  @UseGuards(JwtAuthGuard)
  assignForumModerator(
    @AuthUser() actor: AuthenticatedUser,
    @Args('categoryId', { type: () => ID }) categoryId: string,
    @Args('forumId', { type: () => ID }) forumId: string,
    @Args('moderatorId', { type: () => ID }) moderatorId: string,
  ) {
    return this.execute(
      this.structure.assignModerator(
        actor.id,
        categoryId,
        moderatorId,
        forumId,
      ),
    );
  }

  @Query(() => ForumSectionAccessModel, {
    description: 'Structure managers: role matrix of a category or forum.',
  })
  @UseGuards(JwtAuthGuard)
  async forumSectionAccess(
    @AuthUser() actor: AuthenticatedUser,
    @Args('categoryId', { type: () => ID, nullable: true })
    categoryId: string | null,
    @Args('forumId', { type: () => ID, nullable: true }) forumId: string | null,
  ): Promise<ForumSectionAccessModel> {
    const access = await this.execute(
      this.structure.sectionAccess(actor.id, { categoryId, forumId }),
    );
    return {
      source: access.source,
      own: access.own ? accessRows(access.own) : null,
      effective: accessRows(access.effective),
    };
  }

  @Mutation(() => [ForumCategoryModel], {
    description:
      'Command Deck "Зберегти зміни": updates categories and forums (fields, order, switches, role matrices) in one transaction.',
  })
  @UseGuards(JwtAuthGuard)
  async saveForumSettings(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: SaveForumSettingsInput,
  ) {
    const access = (change: {
      access?: ForumAccessRowInput[] | null;
      resetAccess: boolean;
    }) =>
      change.resetAccess
        ? null
        : change.access
          ? change.access.map((row) => ({ ...row }))
          : undefined;
    const tree = await this.execute(
      this.structure.saveSettings(actor.id, {
        categories: input.categories.map((change) => ({
          id: change.id,
          input: this.categoryInput(change.input),
          access: access(change),
        })),
        forums: input.forums.map((change) => ({
          id: change.id,
          input: this.forumInput(change.input),
          access: access(change),
        })),
      }),
    );
    return tree.map((node) => this.category(node));
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
      allowTopics: input.allowTopics,
      allowReplies: input.allowReplies,
      allowPolls: input.allowPolls,
      allowAttachments: input.allowAttachments,
      listed: input.listed,
      searchable: input.searchable,
      showCounts: input.showCounts,
      pinnedLimit: input.pinnedLimit ?? null,
      attachmentMaxMb: input.attachmentMaxMb ?? null,
      attachmentFormats: input.attachmentFormats,
      autoCloseDays: input.autoCloseDays ?? null,
      gateViewRole: input.gateViewRole,
      gateCreateRole: input.gateCreateRole,
      gateBlockTypes: input.gateBlockTypes,
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
        allowTopics: child.allowTopics,
        allowReplies: child.allowReplies,
        allowPolls: child.allowPolls,
        allowAttachments: child.allowAttachments,
        listed: child.listed,
        searchable: child.searchable,
        showCounts: child.showCounts,
        pinnedLimit: child.pinnedLimit,
        attachmentMaxMb: child.attachmentMaxMb,
        attachmentFormats: child.attachmentFormats,
        autoCloseDays: child.autoCloseDays,
        gateViewRole: child.gateViewRole,
        gateCreateRole: child.gateCreateRole,
        gateBlockTypes: child.gateBlockTypes,
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
