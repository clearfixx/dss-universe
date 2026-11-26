/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/presentation/forum-read-models.resolver.ts
 *
 * 🎯 Purpose:
 * Field resolvers the forum UI needs: member cards for authors and voters,
 * the viewer's own vote, and per-forum counters with the last activity.
 *
 * ⚠️ Important:
 * Every field is batched per request (DataLoader keyed on the request), so a
 * page of 50 posts costs one card query and one vote query. Parents were
 * already authorized by their own queries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject } from '@nestjs/common';
import {
  Context,
  Field,
  ID,
  Int,
  ObjectType,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import DataLoader from 'dataloader';
import type { AuthenticatedUser } from '@api/core/auth';
import {
  FORUM_MEMBER_CARDS,
  type ForumMemberCard,
  type ForumMemberCardReader,
} from '../contracts/forum-member-cards.contract';
import {
  PrismaForumReadModels,
  type ForumActivityStats,
} from '../infrastructure/prisma-forum-read-models';
import {
  FORUM_VIEWER_FACTS,
  type ForumViewerFactsReader,
} from '../contracts/forum-viewer-facts.contract';
import type { ForumViewerFacts } from '../domain/types/forum-structure.type';
import { canCloseTopic, canReopenTopic } from '../domain/forum-topic.rules';
import { ForumPostVoteModel } from './forum-ratings.resolver';
import {
  ForumModel,
  ForumModeratorAssignmentModel,
  ForumSubforumModel,
} from './forum-structure.resolver';
import { ForumPostModel, ForumTopicModel } from './forum-topics.resolver';

type RequestContext = { req: { user?: AuthenticatedUser } };

@ObjectType('ForumMember')
export class ForumMemberModel {
  @Field(() => ID) id!: string;
  @Field() username!: string;
  @Field(() => String, { nullable: true }) displayName!: string | null;
  @Field(() => String, { nullable: true }) avatarUrl!: string | null;
  /** Exposed as joinedAt by ForumMemberStatsResolver. */
  createdAt!: Date;
}

@ObjectType('ForumLastActivity')
class ForumLastActivityModel {
  @Field(() => ID) topicId!: string;
  @Field() title!: string;
  @Field() lastPostAt!: Date;
  @Field(() => Int) lastPostNumber!: number;
  @Field(() => ForumMemberModel, { nullable: true })
  author!: ForumMemberModel | null;
}

@ObjectType('ForumActivityStats')
class ForumActivityStatsModel {
  @Field(() => Int) topicCount!: number;
  @Field(() => Int) postCount!: number;
  @Field(() => ForumLastActivityModel, { nullable: true })
  lastActivity!: ForumLastActivityModel | null;
}

@ObjectType('ForumTopicViewerAbilities', {
  description:
    'What the current viewer may do in this topic; the API still checks every command.',
})
class ForumTopicViewerAbilitiesModel {
  @Field({ description: 'Topic and post moderation in this category.' })
  moderate!: boolean;
  @Field({ description: 'Permanent removal of posts (administrators).' })
  purge!: boolean;
  @Field({
    description: 'Post IP+UA (forum.network.view; every read audited).',
  })
  network!: boolean;
  @Field({ description: 'Erase post IP+UA (forum.network.delete).' })
  networkDelete!: boolean;
  @Field() acceptAnswer!: boolean;
  @Field() close!: boolean;
  @Field() reopen!: boolean;
  @Field({
    description:
      'Signed in and the topic is open; read-only mode is reported by viewerSanctionStatus.',
  })
  reply!: boolean;
}

type ModerationFacts = {
  facts: ForumViewerFacts;
  assigned: Set<string>;
  assignedForums: Set<string>;
};
type SectionFacts = {
  parentId: string | null;
  allowReplies: boolean;
  grant: import('../domain/forum-access.rules').ForumAccessGrant;
};

type Loaders = {
  moderation: () => Promise<ModerationFacts | null>;
  forumCategory: DataLoader<string, string | null>;
  section: DataLoader<string, SectionFacts | null>;
  cards: DataLoader<string, ForumMemberCard | null>;
  votes: DataLoader<string, number | null>;
  stats: DataLoader<string, ForumActivityStats>;
};

const perRequest = new WeakMap<object, Loaders>();

/** Shared batching for all forum field resolvers of one request. */
export class ForumReadLoaders {
  constructor(
    private readonly members: ForumMemberCardReader,
    private readonly reads: PrismaForumReadModels,
    private readonly viewers?: ForumViewerFactsReader,
  ) {}

  for(ctx: RequestContext): Loaders {
    let loaders = perRequest.get(ctx.req);
    if (!loaders) {
      const viewerId = ctx.req.user?.id ?? null;
      let moderation: Promise<ModerationFacts | null> | undefined;
      loaders = {
        moderation: () =>
          (moderation ??= (async () => {
            if (!viewerId || !this.viewers) return null;
            const facts = await this.viewers.read(viewerId, new Date());
            if (facts.subjectId === null) return null;
            const [assigned, assignedForums] = await Promise.all([
              this.reads.assignedCategories(viewerId),
              this.reads.assignedForums(viewerId),
            ]);
            return { facts, assigned, assignedForums };
          })()),
        section: new DataLoader(async (forumIds) => {
          const moderation = await loaders!.moderation();
          if (!moderation) return forumIds.map(() => null);
          const map = await this.reads.forumSections(
            moderation.facts,
            forumIds,
          );
          return forumIds.map((id) => map.get(id) ?? null);
        }),
        forumCategory: new DataLoader(async (forumIds) => {
          const map = await this.reads.forumCategories(forumIds);
          return forumIds.map((id) => map.get(id) ?? null);
        }),
        cards: new DataLoader(async (ids) => {
          const cards = await this.members.cards(ids);
          const byId = new Map(cards.map((card) => [card.id, card]));
          return ids.map((id) => byId.get(id) ?? null);
        }),
        votes: new DataLoader(async (postIds) => {
          if (!viewerId) return postIds.map(() => null);
          const votes = await this.reads.viewerVotes(viewerId, postIds);
          return postIds.map((id) => votes.get(id) ?? null);
        }),
        stats: new DataLoader(async (forumIds) => {
          const stats = await this.reads.forumStats(forumIds);
          return forumIds.map(
            (id) =>
              stats.get(id) ?? { topicCount: 0, postCount: 0, lastTopic: null },
          );
        }),
      };
      perRequest.set(ctx.req, loaders);
    }
    return loaders;
  }
}

abstract class ForumReadResolverBase {
  protected readonly loaders: ForumReadLoaders;
  constructor(
    members: ForumMemberCardReader,
    reads: PrismaForumReadModels,
    viewers?: ForumViewerFactsReader,
  ) {
    this.loaders = new ForumReadLoaders(members, reads, viewers);
  }

  protected card(ctx: RequestContext, id: string | null | undefined) {
    return id ? this.loaders.for(ctx).cards.load(id) : Promise.resolve(null);
  }

  protected async stats(
    ctx: RequestContext,
    forumId: string,
  ): Promise<ForumActivityStatsModel> {
    const stats = await this.loaders.for(ctx).stats.load(forumId);
    return {
      topicCount: stats.topicCount,
      postCount: stats.postCount,
      lastActivity: stats.lastTopic
        ? {
            topicId: stats.lastTopic.id,
            title: stats.lastTopic.title,
            lastPostAt: stats.lastTopic.lastPostAt,
            lastPostNumber: stats.lastTopic.lastPostNumber,
            author: await this.card(ctx, stats.lastTopic.lastPostAuthorId),
          }
        : null,
    };
  }
}

/** Member card of an assigned moderator (Command Deck moderator lists). */
@Resolver(() => ForumModeratorAssignmentModel)
export class ForumModeratorCardResolver extends ForumReadResolverBase {
  constructor(
    @Inject(FORUM_MEMBER_CARDS) members: ForumMemberCardReader,
    reads: PrismaForumReadModels,
  ) {
    super(members, reads);
  }

  @ResolveField(() => ForumMemberModel, { nullable: true })
  moderator(
    @Parent() assignment: ForumModeratorAssignmentModel,
    @Context() ctx: RequestContext,
  ) {
    return this.card(ctx, assignment.moderatorId);
  }
}

@Resolver(() => ForumTopicModel)
export class ForumTopicReadResolver extends ForumReadResolverBase {
  constructor(
    @Inject(FORUM_MEMBER_CARDS) members: ForumMemberCardReader,
    reads: PrismaForumReadModels,
    @Inject(FORUM_VIEWER_FACTS) viewers: ForumViewerFactsReader,
  ) {
    super(members, reads, viewers);
  }

  @ResolveField(() => ForumTopicViewerAbilitiesModel)
  async viewerAbilities(
    @Parent() topic: ForumTopicModel,
    @Context() ctx: RequestContext,
  ): Promise<ForumTopicViewerAbilitiesModel> {
    const loaders = this.loaders.for(ctx);
    const scope = await loaders.moderation();
    if (!scope) {
      return {
        moderate: false,
        purge: false,
        network: false,
        networkDelete: false,
        acceptAnswer: false,
        close: false,
        reopen: false,
        reply: false,
      };
    }
    const { facts, assigned, assignedForums } = scope;
    const [categoryId, section] = await Promise.all([
      loaders.forumCategory.load(topic.forumId),
      loaders.section.load(topic.forumId),
    ]);
    const moderator =
      facts.moderatesAllCategories ||
      facts.seesAllCategories ||
      (categoryId !== null && assigned.has(categoryId)) ||
      assignedForums.has(topic.forumId) ||
      (section?.parentId != null && assignedForums.has(section.parentId)) ||
      section?.grant.moderate === true;
    const actor = { id: facts.subjectId!, moderator };
    const curator = topic.curatorId === actor.id;
    const facts4rules = {
      authorId: topic.authorId,
      curatorId: topic.curatorId,
      state: topic.state,
    };
    return {
      moderate: moderator,
      purge: facts.canPurgeContent,
      network: facts.canViewNetwork === true,
      networkDelete: facts.canDeleteNetwork === true,
      acceptAnswer:
        topic.kind === 'QUESTION' &&
        (moderator || curator || topic.authorId === actor.id) &&
        (topic.acceptedAnswerPostId === null || moderator),
      close: canCloseTopic(facts4rules, actor),
      reopen: canReopenTopic(facts4rules, actor),
      reply:
        topic.state === 'OPEN' &&
        (section?.allowReplies ?? true) &&
        (section?.grant.reply ?? true),
    };
  }

  @ResolveField(() => ForumMemberModel, { nullable: true })
  author(@Parent() topic: ForumTopicModel, @Context() ctx: RequestContext) {
    return this.card(ctx, topic.authorId);
  }

  @ResolveField(() => ForumMemberModel, { nullable: true })
  lastPostAuthor(
    @Parent() topic: ForumTopicModel,
    @Context() ctx: RequestContext,
  ) {
    return this.card(ctx, topic.lastPostAuthorId);
  }

  @ResolveField(() => ForumMemberModel, {
    nullable: true,
    description: 'Who moved the topic to the trash; null outside it.',
  })
  trashedBy(@Parent() topic: ForumTopicModel, @Context() ctx: RequestContext) {
    return topic.trashedById ? this.card(ctx, topic.trashedById) : null;
  }
}

@Resolver(() => ForumPostModel)
export class ForumPostReadResolver extends ForumReadResolverBase {
  constructor(
    @Inject(FORUM_MEMBER_CARDS) members: ForumMemberCardReader,
    reads: PrismaForumReadModels,
  ) {
    super(members, reads);
  }

  @ResolveField(() => ForumMemberModel, { nullable: true })
  author(@Parent() post: ForumPostModel, @Context() ctx: RequestContext) {
    return this.card(ctx, post.authorId);
  }

  @ResolveField(() => Int, {
    nullable: true,
    description:
      "The signed-in viewer's active vote on this post: 1, -1 or null (none, reversed or guest).",
  })
  viewerVote(@Parent() post: ForumPostModel, @Context() ctx: RequestContext) {
    return this.loaders.for(ctx).votes.load(post.id);
  }
}

@Resolver(() => ForumPostVoteModel)
export class ForumPostVoteReadResolver extends ForumReadResolverBase {
  constructor(
    @Inject(FORUM_MEMBER_CARDS) members: ForumMemberCardReader,
    reads: PrismaForumReadModels,
  ) {
    super(members, reads);
  }

  @ResolveField(() => ForumMemberModel, { nullable: true })
  voter(@Parent() vote: ForumPostVoteModel, @Context() ctx: RequestContext) {
    return this.card(ctx, vote.voterId);
  }
}

@Resolver(() => ForumModel)
export class ForumStatsResolver extends ForumReadResolverBase {
  constructor(
    @Inject(FORUM_MEMBER_CARDS) members: ForumMemberCardReader,
    reads: PrismaForumReadModels,
  ) {
    super(members, reads);
  }

  @ResolveField(() => ForumActivityStatsModel)
  activity(@Parent() forum: ForumModel, @Context() ctx: RequestContext) {
    return this.stats(ctx, forum.id);
  }
}

@Resolver(() => ForumSubforumModel)
export class ForumSubforumStatsResolver extends ForumReadResolverBase {
  constructor(
    @Inject(FORUM_MEMBER_CARDS) members: ForumMemberCardReader,
    reads: PrismaForumReadModels,
  ) {
    super(members, reads);
  }

  @ResolveField(() => ForumActivityStatsModel)
  activity(
    @Parent() forum: ForumSubforumModel,
    @Context() ctx: RequestContext,
  ) {
    return this.stats(ctx, forum.id);
  }
}
