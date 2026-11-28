import { sub } from "../forum-feedback/sub.mjs";

const base = "apps/api/src/modules/forum";
const reads = `${base}/infrastructure/prisma-forum-read-models.ts`;
sub(
  reads,
  `  postCount: number;
  lastTopic:`,
  `  postCount: number;
  /** Visible posts without the topic openers. */
  replyCount: number;
  lastTopic:`,
);
sub(
  reads,
  `  postCount: 0,
  lastTopic: null,`,
  `  postCount: 0,
  replyCount: 0,
  lastTopic: null,`,
);
sub(
  reads,
  `        posts: bigint;
`,
  `        posts: bigint;
        replies: bigint;
`,
);
sub(
  reads,
  `WHERE vp."forumId" = vt."forumId")::bigint AS "posts"
`,
  `WHERE vp."forumId" = vt."forumId")::bigint AS "posts",
          (SELECT COUNT(*) FROM visible_posts vp WHERE vp."forumId" = vt."forumId" AND vp."number" > 1)::bigint AS "replies"
`,
);
sub(
  reads,
  `totals."posts",
`,
  `totals."posts", totals."replies",
`,
);
sub(
  reads,
  `        postCount: Number(row.posts),
`,
  `        postCount: Number(row.posts),
        replyCount: Number(row.replies),
`,
);
sub(
  reads,
  `  /** Active (not reversed) vote value of the viewer per post. */`,
  `  /**
   * Active moderator IDs per section: assignments to one forum, or (with
   * \`category\`) to a whole category. Oldest assignment first.
   */
  async sectionModerators(
    scope: 'forum' | 'category',
    ids: readonly string[],
  ): Promise<Map<string, string[]>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.forumModeratorAssignment.findMany({
      where: {
        revokedAt: null,
        ...(scope === 'forum'
          ? { forumId: { in: [...ids] } }
          : { forumId: null, categoryId: { in: [...ids] } }),
      },
      orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
      select: { categoryId: true, forumId: true, moderatorId: true },
    });
    const result = new Map<string, string[]>();
    for (const row of rows) {
      const key = scope === 'forum' ? row.forumId! : row.categoryId;
      result.set(key, [...(result.get(key) ?? []), row.moderatorId]);
    }
    return result;
  }

  /** Active (not reversed) vote value of the viewer per post. */`,
);

const res = `${base}/presentation/forum-read-models.resolver.ts`;
sub(
  res,
  `  @Field(() => Int) postCount!: number;
  @Field(() => ForumLastActivityModel`,
  `  @Field(() => Int) postCount!: number;
  @Field(() => Int, { description: 'Posts without the topic openers.' })
  replyCount!: number;
  @Field(() => ForumLastActivityModel`,
);
sub(
  res,
  `  stats: DataLoader<string, ForumActivityStats>;
};`,
  `  stats: DataLoader<string, ForumActivityStats>;
  forumModerators: DataLoader<string, string[]>;
  categoryModerators: DataLoader<string, string[]>;
};`,
);
sub(
  res,
  `            (id) =>
              stats.get(id) ?? { topicCount: 0, postCount: 0, lastTopic: null },
          );
        }),`,
  `            (id) =>
              stats.get(id) ?? {
                topicCount: 0,
                postCount: 0,
                replyCount: 0,
                lastTopic: null,
              },
          );
        }),
        forumModerators: new DataLoader(async (ids) => {
          const map = await this.reads.sectionModerators('forum', ids);
          return ids.map((id) => map.get(id) ?? []);
        }),
        categoryModerators: new DataLoader(async (ids) => {
          const map = await this.reads.sectionModerators('category', ids);
          return ids.map((id) => map.get(id) ?? []);
        }),`,
);
sub(
  res,
  `      postCount: stats.postCount,
      lastActivity:`,
  `      postCount: stats.postCount,
      replyCount: stats.replyCount,
      lastActivity:`,
);
sub(
  res,
  `  protected async stats(`,
  `  protected async moderatorCards(
    ctx: RequestContext,
    scope: 'forumModerators' | 'categoryModerators',
    id: string,
  ): Promise<ForumMemberCard[]> {
    const ids = await this.loaders.for(ctx)[scope].load(id);
    const cards = await Promise.all(ids.map((each) => this.card(ctx, each)));
    return cards.filter((card): card is ForumMemberCard => card !== null);
  }

  protected async stats(`,
);
const field = (type) => `
  @ResolveField(() => [ForumMemberModel], {
    description: 'Moderators assigned to this forum itself.',
  })
  moderators(@Parent() forum: ${type}, @Context() ctx: RequestContext) {
    return this.moderatorCards(ctx, 'forumModerators', forum.id);
  }
}`;
sub(
  res,
  `  activity(@Parent() forum: ForumModel, @Context() ctx: RequestContext) {
    return this.stats(ctx, forum.id);
  }
}`,
  `  activity(@Parent() forum: ForumModel, @Context() ctx: RequestContext) {
    return this.stats(ctx, forum.id);
  }
${field("ForumModel")}`,
);
sub(
  res,
  `    @Parent() forum: ForumSubforumModel,
    @Context() ctx: RequestContext,
  ) {
    return this.stats(ctx, forum.id);
  }
}`,
  `    @Parent() forum: ForumSubforumModel,
    @Context() ctx: RequestContext,
  ) {
    return this.stats(ctx, forum.id);
  }
${field("ForumSubforumModel")}

@Resolver(() => ForumCategoryModel)
export class ForumCategoryModeratorsResolver extends ForumReadResolverBase {
  constructor(
    @Inject(FORUM_MEMBER_CARDS) members: ForumMemberCardReader,
    reads: PrismaForumReadModels,
    @Inject(FORUM_VIEWER_FACTS) viewers: ForumViewerFactsReader,
  ) {
    super(members, reads, viewers);
  }

  @ResolveField(() => [ForumMemberModel], {
    description: 'Moderators assigned to the whole category.',
  })
  moderators(
    @Parent() category: ForumCategoryModel,
    @Context() ctx: RequestContext,
  ) {
    return this.moderatorCards(ctx, 'categoryModerators', category.id);
  }
}`,
);
sub(
  res,
  `import {
  ForumModel,`,
  `import {
  ForumCategoryModel,
  ForumModel,`,
);
sub(
  `${base}/presentation/forum-structure.resolver.ts`,
  `class ForumCategoryModel {`,
  `export class ForumCategoryModel {`,
);
const mod = `${base}/forum.module.ts`;
sub(
  mod,
  `  ForumModeratorCardResolver,
  ForumPostReadResolver,`,
  `  ForumModeratorCardResolver,
  ForumCategoryModeratorsResolver,
  ForumPostReadResolver,`,
);
sub(
  mod,
  `    ForumModeratorCardResolver,
`,
  `    ForumModeratorCardResolver,
    ForumCategoryModeratorsResolver,
`,
);

const e2e = "apps/api/test/forum-read-models.e2e-spec.ts";
sub(
  e2e,
  `      postCount: 2,
      lastTopic: {`,
  `      postCount: 2,
      replyCount: 1,
      lastTopic: {`,
);
sub(
  e2e,
  `      postCount: 0,
      lastTopic: null,
    });
  });`,
  `      postCount: 0,
      replyCount: 0,
      lastTopic: null,
    });
  });

  it('lists active moderators separately for a forum and its category', async () => {
    const f = await forum();
    const { categoryId } = await fixture.prisma.forum.findUniqueOrThrow({
      where: { id: f.forumId },
      select: { categoryId: true },
    });
    const admin = await user({
      seesAllCategories: true,
      canAssignModerators: true,
    });
    const own = await user();
    const former = await user();
    await structure.assignModerator(admin, categoryId, own, f.forumId);
    const revoked = await structure.assignModerator(
      admin,
      categoryId,
      former,
      f.forumId,
    );
    await structure.revokeModerator(admin, revoked.id);

    await expect(
      reads.sectionModerators('forum', [f.forumId]),
    ).resolves.toEqual(new Map([[f.forumId, [own]]]));
    await expect(
      reads.sectionModerators('category', [categoryId]),
    ).resolves.toEqual(new Map([[categoryId, [f.moderator]]]));
  });`,
);
