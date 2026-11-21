/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/presentation/forum-member-stats.resolver.ts
 *
 * 🎯 Purpose:
 * Public standing of a forum member for the post author column: forum post
 * count, reputation total, current level and join date.
 *
 * ⚠️ Important:
 * Batched per request: one page of posts costs one count query plus one
 * standing batch, however many authors it shows. Only public numbers; no
 * balances, history or private profile data.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject } from '@nestjs/common';
import {
  Context,
  Field,
  Int,
  ObjectType,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import DataLoader from 'dataloader';
import {
  FORUM_MEMBER_STATS,
  type ForumMemberStatsReader,
} from '../contracts/forum-member-stats.contract';
import { PrismaForumReadModels } from '../infrastructure/prisma-forum-read-models';
import { ForumMemberModel } from './forum-read-models.resolver';

@ObjectType('ForumMemberStats', {
  description: 'Public standing shown next to forum posts.',
})
export class ForumMemberStatsModel {
  @Field(() => Int, {
    description: 'Visible posts in live topics across the forum.',
  })
  postCount!: number;
  @Field(() => Int) reputation!: number;
  @Field(() => Int) level!: number;
}

type StatsLoader = DataLoader<string, ForumMemberStatsModel>;
const perRequest = new WeakMap<object, StatsLoader>();

@Resolver(() => ForumMemberModel)
export class ForumMemberStatsResolver {
  constructor(
    @Inject(FORUM_MEMBER_STATS)
    private readonly standings: ForumMemberStatsReader,
    private readonly reads: PrismaForumReadModels,
  ) {}

  @ResolveField(() => ForumMemberStatsModel)
  stats(
    @Parent() member: ForumMemberModel,
    @Context() ctx: { req: object },
  ): Promise<ForumMemberStatsModel> {
    let loader = perRequest.get(ctx.req);
    if (!loader) {
      loader = new DataLoader(async (ids: readonly string[]) => {
        const [counts, standings] = await Promise.all([
          this.reads.memberPostCounts(ids),
          this.standings.standings(ids),
        ]);
        return ids.map((id) => ({
          postCount: counts.get(id) ?? 0,
          reputation: standings.get(id)?.reputation ?? 0,
          level: standings.get(id)?.level ?? 0,
        }));
      });
      perRequest.set(ctx.req, loader);
    }
    return loader.load(member.id);
  }

  @ResolveField(() => Date, { description: 'Account creation time.' })
  joinedAt(@Parent() member: ForumMemberModel): Date {
    return member.createdAt;
  }
}
