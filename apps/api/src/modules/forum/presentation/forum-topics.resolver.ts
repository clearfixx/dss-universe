/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/presentation/forum-topics.resolver.ts
 *
 * 🎯 Purpose:
 * Thin GraphQL transport for topics, posts and edit history.
 *
 * ⚠️ Important:
 * Non-visible posts are returned as tombstones with null content.
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
  Inject,
  NotFoundException,
  Optional,
  UseGuards,
} from '@nestjs/common';
import { collectEditorMediaIds } from '@dss/editor';
import {
  FORUM_POST_MEDIA,
  type ForumPostMedia,
} from '../infrastructure/forum-post-media.port';
import {
  Args,
  Context,
  Field,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Parent,
  Query,
  registerEnumType,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { OptionalViewerJwtGuard } from '@api/core/auth/guards/optional-viewer-jwt.guard';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import {
  FORUM_POST_STATES,
  FORUM_REPLY_SORTS,
  FORUM_TOPIC_KINDS,
  FORUM_TOPIC_SCOPES,
  FORUM_TOPIC_SORTS,
  FORUM_TOPIC_STATES,
  FORUM_TOPIC_FILTERS,
  FORUM_VIEWER_COLLECTIONS,
  type ForumPage,
  type ForumPostState,
  type ForumReplySort,
  type ForumTopicFilter,
  type ForumTopicKind,
  type ForumViewerCollection,
  type ForumTopicScope,
  type ForumTopicSort,
  type ForumTopicState,
} from '../domain/types/forum-topic.type';
import { ForumTopicsService } from '../infrastructure/prisma-forum-topics';
import {
  FORUM_TOP_PERIODS,
  type ForumTopPeriod,
} from '../domain/forum-rating.rules';
import { ForumStaffNoteModel } from './forum-shared.models';

const enumOf = <T extends string>(values: readonly T[]) =>
  Object.fromEntries(values.map((value) => [value, value])) as Record<T, T>;
const TopicKindEnum = enumOf(FORUM_TOPIC_KINDS);
const TopicStateEnum = enumOf(FORUM_TOPIC_STATES);
const PostStateEnum = enumOf(FORUM_POST_STATES);
const TopicSortEnum = enumOf(FORUM_TOPIC_SORTS);
const TopicScopeEnum = enumOf(FORUM_TOPIC_SCOPES);
registerEnumType(TopicScopeEnum, { name: 'ForumTopicScope' });
const TopPeriodEnum = enumOf(FORUM_TOP_PERIODS);
registerEnumType(TopPeriodEnum, { name: 'ForumTopPeriod' });
registerEnumType(TopicKindEnum, { name: 'ForumTopicKind' });
registerEnumType(TopicStateEnum, { name: 'ForumTopicState' });
registerEnumType(PostStateEnum, { name: 'ForumPostState' });
registerEnumType(TopicSortEnum, { name: 'ForumTopicSort' });
const ReplySortEnum = enumOf(FORUM_REPLY_SORTS);
registerEnumType(ReplySortEnum, {
  name: 'ForumReplySort',
  description:
    'Order of replies; the first post always opens page 1. BEST = net rating, ties by number.',
});
const TopicFilterEnum = enumOf(FORUM_TOPIC_FILTERS);
registerEnumType(TopicFilterEnum, {
  name: 'ForumTopicFilter',
  description:
    'MINE: authored by the viewer; NO_REPLIES: no replies yet; UNSOLVED: questions without an accepted answer.',
});
const ViewerCollectionEnum = enumOf(FORUM_VIEWER_COLLECTIONS);
registerEnumType(ViewerCollectionEnum, { name: 'ForumViewerCollection' });
const DiscoverFilterEnum = {
  ALL: 'ALL',
  NO_REPLIES: 'NO_REPLIES',
  UNSOLVED: 'UNSOLVED',
} as const;
registerEnumType(DiscoverFilterEnum, {
  name: 'ForumDiscoverFilter',
  description:
    'NO_REPLIES: nobody replied yet; UNSOLVED: questions without an accepted answer.',
});
const DiscoverSortEnum = {
  NEW: 'NEW',
  LAST_ACTIVITY: 'LAST_ACTIVITY',
} as const;
registerEnumType(DiscoverSortEnum, { name: 'ForumDiscoverSort' });

@ObjectType('ForumHubStats')
class ForumHubStatsModel {
  @Field(() => Int) forumCount!: number;
  @Field(() => Int) topicCount!: number;
  @Field(() => Int, { description: 'Visible posts only.' }) postCount!: number;
  @Field(() => Int, { description: 'Distinct authors of visible posts.' })
  participantCount!: number;
}

@ObjectType('ForumPopularTag')
class ForumPopularTagModel {
  @Field() slug!: string;
  @Field() label!: string;
  @Field(() => Int) topicCount!: number;
}

@InputType()
export class CreateForumTopicInput {
  @Field(() => ID) @IsString() forumId!: string;
  @Field(() => TopicKindEnum, { defaultValue: 'DISCUSSION' })
  @IsIn(FORUM_TOPIC_KINDS)
  kind!: ForumTopicKind;
  @Field() @IsString() title!: string;
  @Field() @IsString() documentJson!: string;
}

@InputType()
export class CreateForumReplyInput {
  @Field(() => ID) @IsString() topicId!: string;
  @Field() @IsString() documentJson!: string;
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  replyToNumber?: number | null;
  @Field(() => [Int], { defaultValue: [] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  quotedNumbers!: number[];
}

@InputType()
export class EditForumPostInput {
  @Field(() => ID) @IsString() postId!: string;
  @Field(() => Int) @IsInt() @Min(1) expectedRevision!: number;
  @Field() @IsString() documentJson!: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  title?: string | null;
}

@ObjectType('ForumTopicTag')
class ForumTopicTagModel {
  @Field(() => ID) id!: string;
  @Field() slug!: string;
  @Field() label!: string;
}

@ObjectType('ForumTopic')
export class ForumTopicModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) forumId!: string;
  @Field(() => ID) interactionTargetId!: string;
  @Field(() => ID) authorId!: string;
  @Field(() => TopicKindEnum) kind!: ForumTopicKind;
  @Field() title!: string;
  @Field(() => TopicStateEnum) state!: ForumTopicState;
  @Field() pinned!: boolean;
  @Field(() => ID, { nullable: true }) curatorId!: string | null;
  @Field(() => Int) postCount!: number;
  @Field(() => Int) lastPostNumber!: number;
  @Field() lastPostAt!: Date;
  @Field(() => ID) lastPostAuthorId!: string;
  @Field() createdAt!: Date;
  @Field(() => Int) ratingUp!: number;
  @Field(() => Int) ratingDown!: number;
  @Field(() => Int) viewCount!: number;
  @Field(() => Int, {
    nullable: true,
    description: 'Furthest post number read by the viewer; null for guests.',
  })
  viewerLastReadNumber!: number | null;
  @Field(() => ID, { nullable: true }) acceptedAnswerPostId!: string | null;
  @Field(() => ID, { nullable: true }) mergedIntoTopicId!: string | null;
  @Field(() => Date, {
    nullable: true,
    description: 'When the topic was moved to the trash; null outside it.',
  })
  trashedAt!: Date | null;
  @Field(() => ID, { nullable: true }) trashedById!: string | null;
  @Field(() => [ForumTopicTagModel]) tags!: ForumTopicTagModel[];
}

@ObjectType('ForumTopicFacets', {
  description:
    'Counts among live (open and closed) topics unless noted; mine is null for guests.',
})
export class ForumTopicFacetsModel {
  @Field(() => Int) total!: number;
  @Field(() => Int) questions!: number;
  @Field(() => Int) discussions!: number;
  @Field(() => Int, { description: 'Topics with an accepted answer.' })
  accepted!: number;
  @Field(() => Int, { description: 'Questions without an accepted answer.' })
  unsolved!: number;
  @Field(() => Int, { description: 'Topics nobody replied to yet.' })
  noReplies!: number;
  @Field(() => Int) closed!: number;
  @Field(() => Int, { description: 'Archived topics (not live).' })
  archived!: number;
  @Field(() => Int, { nullable: true })
  mine!: number | null;
  @Field(() => Int, {
    description: 'Distinct members with a visible post in a live topic.',
  })
  participants!: number;
}

@ObjectType('ForumTopicPage')
class ForumTopicPageModel {
  @Field(() => [ForumTopicModel]) items!: ForumTopicModel[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) limit!: number;
}

@ObjectType('ForumPostModeration')
class ForumPostModerationModel {
  @Field() at!: Date;
  @Field(() => ID) byId!: string;
  @Field() reason!: string;
}

@ObjectType('ForumPost')
export class ForumPostModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) topicId!: string;
  @Field(() => Int) number!: number;
  @Field(() => ID) authorId!: string;
  @Field(() => PostStateEnum) state!: ForumPostState;
  @Field(() => String, {
    nullable: true,
    description: 'Null for tombstones the viewer may not read.',
  })
  documentJson!: string | null;
  @Field(() => Int, { nullable: true }) replyToNumber!: number | null;
  @Field(() => [Int]) quotedNumbers!: number[];
  @Field(() => Int) revision!: number;
  @Field(() => Int) ratingUp!: number;
  @Field(() => Int) ratingDown!: number;
  @Field() createdAt!: Date;
  @Field(() => Date, { nullable: true }) editedAt!: Date | null;
  @Field(() => ForumPostModerationModel, {
    nullable: true,
    description: 'Returned to staff of the topic only.',
  })
  moderation!: ForumPostModerationModel | null;
  @Field(() => [ForumStaffNoteModel]) staffNotes!: ForumStaffNoteModel[];
}

@ObjectType('ForumPostAttachment')
class ForumPostAttachmentModel {
  @Field(() => ID) mediaId!: string;
  @Field() filename!: string;
  @Field() mimeType!: string;
  @Field(() => Int) size!: number;
  @Field() downloadUrl!: string;
}

/**
 * Files of the viewer-safe document only: gated blocks the viewer cannot read
 * were already removed, so their files never appear here.
 */
@Resolver(() => ForumPostModel)
export class ForumPostMediaResolver {
  constructor(
    @Optional()
    @Inject(FORUM_POST_MEDIA)
    private readonly media?: ForumPostMedia,
  ) {}

  @ResolveField(() => [ForumPostAttachmentModel])
  async attachments(
    @Parent() post: ForumPostModel,
  ): Promise<ForumPostAttachmentModel[]> {
    if (!this.media || !post.documentJson) return [];
    const ids = collectEditorMediaIds(
      JSON.parse(post.documentJson) as Parameters<
        typeof collectEditorMediaIds
      >[0],
    );
    return ids.length ? [...(await this.media.attachments(post.id, ids))] : [];
  }
}

@ObjectType('ForumPostPage')
class ForumPostPageModel {
  @Field(() => [ForumPostModel]) items!: ForumPostModel[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) limit!: number;
}

@ObjectType('ForumPostRevision')
class ForumPostRevisionModel {
  @Field(() => Int) revision!: number;
  @Field(() => ID) editorId!: string;
  @Field() createdAt!: Date;
}

@ObjectType('ForumTopicCreated')
class ForumTopicCreatedModel {
  @Field(() => ForumTopicModel) topic!: ForumTopicModel;
  @Field(() => ID) firstPostId!: string;
}

type RequestContext = { req: { user?: AuthenticatedUser } };

@Resolver()
export class ForumTopicsResolver {
  constructor(private readonly topics: ForumTopicsService) {}

  @Query(() => ForumTopicPageModel)
  @UseGuards(OptionalViewerJwtGuard)
  forumTopics(
    @Context() ctx: RequestContext,
    @Args('forumId', { type: () => ID }) forumId: string,
    @Args('sort', { type: () => TopicSortEnum, defaultValue: 'LAST_ACTIVITY' })
    sort: ForumTopicSort,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('scope', { type: () => TopicScopeEnum, defaultValue: 'ACTIVE' })
    scope: ForumTopicScope,
    @Args('topPeriod', { type: () => TopPeriodEnum, defaultValue: 'WEEK' })
    topPeriod: ForumTopPeriod,
    @Args('tagSlug', { type: () => String, nullable: true })
    tagSlug: string | null,
    @Args('filter', { type: () => TopicFilterEnum, defaultValue: 'ALL' })
    filter: ForumTopicFilter,
    @Args('kind', {
      type: () => TopicKindEnum,
      nullable: true,
      description: 'Only questions or only discussions; all when omitted.',
    })
    kind: ForumTopicKind | null,
  ): Promise<ForumPage<ForumTopicModel>> {
    return this.execute(
      this.topics.topics(
        this.viewer(ctx),
        forumId,
        sort,
        page,
        limit,
        scope,
        topPeriod,
        tagSlug ?? null,
        filter,
        kind ?? null,
      ),
    );
  }

  @Query(() => ForumTopicPageModel, {
    description:
      'Forum trash: trashed topics of the sections the viewer moderates, most recently trashed first. Moderators only.',
  })
  @UseGuards(JwtAuthGuard)
  forumTrash(
    @AuthUser() user: AuthenticatedUser,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('forumId', { type: () => ID, nullable: true })
    forumId: string | null,
    @Args('search', { type: () => String, nullable: true })
    search: string | null,
  ): Promise<ForumPage<ForumTopicModel>> {
    return this.execute(
      this.topics.trash(user.id, page, limit, forumId ?? null, search ?? null),
    );
  }

  @Query(() => ForumTopicFacetsModel, {
    description: 'Topic counts of one section for its filters and header.',
  })
  @UseGuards(OptionalViewerJwtGuard)
  forumTopicFacets(
    @Context() ctx: RequestContext,
    @Args('forumId', { type: () => ID }) forumId: string,
  ): Promise<ForumTopicFacetsModel> {
    return this.execute(this.topics.facets(this.viewer(ctx), forumId));
  }

  @Query(() => ForumTopicPageModel, {
    description:
      'Signed-in viewer: own (AUTHORED) or followed (SUBSCRIBED) topics, or live topics of followed sections (FOLLOWED_SECTIONS, newest first), across visible forums.',
  })
  @UseGuards(JwtAuthGuard)
  viewerForumTopics(
    @AuthUser() user: AuthenticatedUser,
    @Args('collection', { type: () => ViewerCollectionEnum })
    collection: ForumViewerCollection,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<ForumPage<ForumTopicModel>> {
    return this.execute(
      this.topics.viewerTopics(user.id, collection, page, limit),
    );
  }

  @Query(() => ForumTopicPageModel, {
    description:
      'Open and closed topics across every forum the viewer can see (guests included).',
  })
  @UseGuards(OptionalViewerJwtGuard)
  forumDiscoverTopics(
    @Context() ctx: RequestContext,
    @Args('filter', { type: () => DiscoverFilterEnum, defaultValue: 'ALL' })
    filter: keyof typeof DiscoverFilterEnum,
    @Args('sort', { type: () => DiscoverSortEnum, defaultValue: 'NEW' })
    sort: keyof typeof DiscoverSortEnum,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<ForumPage<ForumTopicModel>> {
    return this.execute(
      this.topics.discoverTopics(this.viewer(ctx), filter, sort, page, limit),
    );
  }

  @Query(() => ForumHubStatsModel)
  @UseGuards(OptionalViewerJwtGuard)
  forumHubStats(@Context() ctx: RequestContext): Promise<ForumHubStatsModel> {
    return this.execute(this.topics.hubStats(this.viewer(ctx)));
  }

  @Query(() => [ForumPopularTagModel])
  @UseGuards(OptionalViewerJwtGuard)
  forumPopularTags(
    @Context() ctx: RequestContext,
    @Args('limit', { type: () => Int, defaultValue: 12 }) limit: number,
  ): Promise<ForumPopularTagModel[]> {
    return this.execute(this.topics.popularTags(this.viewer(ctx), limit));
  }

  @Query(() => [ForumTopicModel], {
    description:
      'Related topics the viewer can read: shared tags, then the same section.',
  })
  @UseGuards(OptionalViewerJwtGuard)
  forumSimilarTopics(
    @Context() ctx: RequestContext,
    @Args('topicId', { type: () => ID }) topicId: string,
    @Args('limit', { type: () => Int, defaultValue: 3 }) limit: number,
  ) {
    return this.execute(
      this.topics.similarTopics(this.viewer(ctx), topicId, limit),
    );
  }

  @Query(() => ForumTopicModel)
  @UseGuards(OptionalViewerJwtGuard)
  forumTopic(
    @Context() ctx: RequestContext,
    @Args('topicId', { type: () => ID }) topicId: string,
  ) {
    return this.execute(this.topics.topic(this.viewer(ctx), topicId));
  }

  @Query(() => ForumPostPageModel)
  @UseGuards(OptionalViewerJwtGuard)
  forumPosts(
    @Context() ctx: RequestContext,
    @Args('topicId', { type: () => ID }) topicId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('sort', { type: () => ReplySortEnum, defaultValue: 'OLDEST' })
    sort: ForumReplySort,
  ) {
    return this.execute(
      this.topics.posts(this.viewer(ctx), topicId, page, limit, sort),
    );
  }

  @Query(() => [ForumPostRevisionModel])
  @UseGuards(OptionalViewerJwtGuard)
  forumPostRevisions(
    @Context() ctx: RequestContext,
    @Args('postId', { type: () => ID }) postId: string,
  ) {
    return this.execute(this.topics.revisions(this.viewer(ctx), postId));
  }

  @Mutation(() => ForumTopicCreatedModel)
  @UseGuards(JwtAuthGuard)
  createForumTopic(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: CreateForumTopicInput,
  ) {
    return this.execute(this.topics.createTopic(actor.id, { ...input }));
  }

  @Mutation(() => ForumPostModel)
  @UseGuards(JwtAuthGuard)
  createForumReply(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: CreateForumReplyInput,
  ) {
    return this.execute(
      this.topics.reply(actor.id, {
        topicId: input.topicId,
        documentJson: input.documentJson,
        replyToNumber: input.replyToNumber ?? null,
        quotedNumbers: input.quotedNumbers,
      }),
    );
  }

  @Mutation(() => ForumPostModel)
  @UseGuards(JwtAuthGuard)
  editForumPost(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: EditForumPostInput,
  ) {
    return this.execute(this.topics.editPost(actor.id, { ...input }));
  }

  @Mutation(() => ForumTopicModel)
  @UseGuards(JwtAuthGuard)
  closeForumTopic(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
  ) {
    return this.execute(this.topics.closeTopic(actor.id, topicId));
  }

  @Mutation(() => ForumTopicModel)
  @UseGuards(JwtAuthGuard)
  reopenForumTopic(
    @AuthUser() actor: AuthenticatedUser,
    @Args('topicId', { type: () => ID }) topicId: string,
  ) {
    return this.execute(this.topics.reopenTopic(actor.id, topicId));
  }

  private viewer(ctx: RequestContext): string | null {
    return ctx.req.user?.id ?? null;
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
          throw new HttpException(
            {
              message: error.message,
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
      }
    }
  }
}
