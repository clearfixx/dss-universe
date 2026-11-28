import { BadRequestException, UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Field,
  ID,
  Int,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import type { AuthenticatedUser } from '@api/core/auth';
import { OptionalViewerJwtGuard } from '@api/core/auth/guards/optional-viewer-jwt.guard';
import { ResearchLabDelivery } from './infrastructure/research-lab-delivery';

type RequestContext = { req: { user?: AuthenticatedUser } };
@ObjectType()
export class ResearchCategoryEntry {
  @Field(() => ID) id!: string;
  @Field(() => ID, { nullable: true }) parentId!: string | null;
  @Field() name!: string;
  @Field() slug!: string;
  @Field(() => String, { nullable: true }) description!: string | null;
  @Field(() => Int) sortOrder!: number;
}
@ObjectType()
class ResearchContainerPage {
  @Field(() => ID) id!: string;
  @Field() slug!: string;
  @Field(() => String, { nullable: true }) title!: string | null;
}
@ObjectType()
class ResearchContainerItem {
  @Field(() => Int) position!: number;
  @Field(() => ResearchContainerPage) page!: ResearchContainerPage;
}
@ObjectType()
class ResearchManualEntry {
  @Field(() => ID) id!: string;
  @Field() language!: string;
  @Field() slug!: string;
  @Field() title!: string;
  @Field(() => String, { nullable: true }) description!: string | null;
  @Field(() => [ResearchContainerItem]) chapters!: ResearchContainerItem[];
}
@ObjectType()
class ResearchCollectionEntry {
  @Field(() => ID) id!: string;
  @Field() language!: string;
  @Field() slug!: string;
  @Field() title!: string;
  @Field(() => String, { nullable: true }) description!: string | null;
  @Field(() => [ResearchContainerItem]) items!: ResearchContainerItem[];
}
@ObjectType()
class ResearchTagEntry {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() slug!: string;
}
@ObjectType()
class ResearchTechnologyEntry {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() slug!: string;
  @Field(() => String, { nullable: true }) description!: string | null;
  @Field(() => String, { nullable: true }) website!: string | null;
}
@ObjectType()
class ResearchPublishedPage {
  @Field(() => ID) id!: string;
  @Field() language!: string;
  @Field() slug!: string;
  @Field() state!: string;
  @Field(() => Int) generation!: number;
  @Field(() => ID) revisionId!: string;
  @Field() title!: string;
  @Field() summary!: string;
  @Field() documentJson!: string;
  @Field(() => [ResearchTagEntry]) tags!: ResearchTagEntry[];
  @Field(() => [ResearchTechnologyEntry])
  technologies!: ResearchTechnologyEntry[];
  @Field(() => ResearchCategoryEntry, { nullable: true })
  primaryCategory!: ResearchCategoryEntry | null;
  @Field(() => [ResearchCategoryEntry]) categories!: ResearchCategoryEntry[];
}
@ObjectType()
class ResearchHistoryEntry {
  @Field(() => ID) id!: string;
  @Field(() => Int) number!: number;
  @Field(() => ID) authorId!: string;
  @Field() createdAt!: Date;
  @Field() editSummary!: string;
  @Field(() => String, { nullable: true }) publicationDecision!: string | null;
  @Field() state!: string;
}
@ObjectType()
class ResearchRevisionComparison {
  @Field() fromDocumentJson!: string;
  @Field() toDocumentJson!: string;
}
@ObjectType()
class ResearchRelatedPage {
  @Field(() => ID) id!: string;
  @Field() language!: string;
  @Field() slug!: string;
  @Field() title!: string;
}
@ObjectType()
class ResearchPublicIndexEntry {
  @Field(() => ID) id!: string;
  @Field() language!: string;
  @Field() slug!: string;
  @Field() title!: string;
  @Field() description!: string;
  @Field() updatedAt!: Date;
}
@Resolver()
@UseGuards(OptionalViewerJwtGuard)
export class ResearchLabReadResolver {
  constructor(private readonly delivery: ResearchLabDelivery) {}
  @Query(() => [ResearchCategoryEntry])
  researchCategories() {
    return this.delivery.categories();
  }
  @Query(() => [ResearchManualEntry])
  async researchManuals(@Context() ctx: RequestContext) {
    const rows = await this.delivery.manuals(ctx.req.user?.id ?? null);
    return rows.map((row) => ({
      ...row,
      chapters: row.chapters.map(({ page, position }) => ({
        position,
        page: { ...page, title: page.publishedRevision?.title ?? null },
      })),
    }));
  }
  @Query(() => [ResearchCollectionEntry])
  async researchCollections(@Context() ctx: RequestContext) {
    const rows = await this.delivery.collections(ctx.req.user?.id ?? null);
    return rows.map((row) => ({
      ...row,
      items: row.items.map(({ page, position }) => ({
        position,
        page: { ...page, title: page.publishedRevision?.title ?? null },
      })),
    }));
  }
  @Query(() => [ResearchTagEntry])
  researchTags(@Context() ctx: RequestContext) {
    return this.delivery.tags(ctx.req.user?.id ?? null);
  }
  @Query(() => [ResearchTechnologyEntry])
  researchTechnologies(@Context() ctx: RequestContext) {
    return this.delivery.technologies(ctx.req.user?.id ?? null);
  }
  @Query(() => ResearchPublishedPage, { nullable: true })
  researchPage(
    @Context() ctx: RequestContext,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.delivery.page(ctx.req.user?.id ?? null, { id });
  }
  @Query(() => ResearchPublishedPage, { nullable: true })
  researchPageByRoute(
    @Context() ctx: RequestContext,
    @Args('language') language: string,
    @Args('slug') slug: string,
  ) {
    return this.delivery.page(ctx.req.user?.id ?? null, { language, slug });
  }
  @Query(() => ResearchPublicIndexEntry, { nullable: true })
  async researchPageSeo(@Args('pageId', { type: () => ID }) pageId: string) {
    const [entry] = await this.delivery.publicIndex({ id: pageId });
    return entry ?? null;
  }
  @Query(() => [ResearchPublicIndexEntry])
  researchSitemap(
    @Args('after', { type: () => ID, nullable: true })
    after: string | undefined,
    @Args('limit', { type: () => Int, defaultValue: 50 }) limit: number,
  ) {
    if (limit < 1 || limit > 100)
      throw new BadRequestException('Invalid sitemap page size.');
    return this.delivery.publicIndex({ after, limit });
  }
  @Query(() => [ResearchRelatedPage])
  researchRelatedPages(
    @Context() ctx: RequestContext,
    @Args('pageId', { type: () => ID }) pageId: string,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ) {
    if (limit < 1 || limit > 50)
      throw new BadRequestException('Invalid related page limit.');
    return this.delivery.related(ctx.req.user?.id ?? null, pageId, limit);
  }
  @Query(() => [ResearchHistoryEntry])
  researchRevisionHistory(
    @Context() ctx: RequestContext,
    @Args('pageId', { type: () => ID }) pageId: string,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ) {
    if (offset < 0 || limit < 1 || limit > 100)
      throw new BadRequestException('Invalid history pagination.');
    return this.delivery.history(
      ctx.req.user?.id ?? null,
      pageId,
      offset,
      limit,
    );
  }
  @Query(() => ResearchRevisionComparison, { nullable: true })
  researchRevisionDiff(
    @Context() ctx: RequestContext,
    @Args('pageId', { type: () => ID }) pageId: string,
    @Args('from', { type: () => ID }) from: string,
    @Args('to', { type: () => ID }) to: string,
  ) {
    return this.delivery.compare(ctx.req.user?.id ?? null, pageId, from, to);
  }
}
