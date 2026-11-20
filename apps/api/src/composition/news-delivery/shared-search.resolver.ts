import {
  RESEARCH_SEARCH_SOURCE,
  type ResearchSearchSource,
} from '@api/modules/research-lab';
import { BadRequestException, Inject, UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Field,
  ID,
  Int,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
} from '@nestjs/graphql';
import type { AuthenticatedUser } from '@api/core/auth';
import { OptionalViewerJwtGuard } from '@api/core/auth/guards/optional-viewer-jwt.guard';
import {
  NEWS_SEARCH_SOURCE,
  type NewsSearchSource,
} from './news-search-source';

enum SharedSearchSource {
  NEWS = 'NEWS',
  RESEARCH_LAB = 'RESEARCH_LAB',
}
registerEnumType(SharedSearchSource, { name: 'SharedSearchSource' });
@ObjectType()
class SearchHit {
  @Field(() => ID, { nullable: true }) revisionId?: string;
  @Field(() => String, { nullable: true }) kind?: string;
  @Field() source!: string;
  @Field(() => ID) id!: string;
  @Field() title!: string;
  @Field() language!: string;
  @Field() slug!: string;
  @Field() excerpt!: string;
  @Field() publishedAt!: Date;
}
@ObjectType()
class SearchCategoryCount {
  @Field() slug!: string;
  @Field(() => Int) total!: number;
}
@ObjectType()
class SearchPage {
  @Field(() => [SearchHit]) items!: SearchHit[];
  @Field(() => [SearchCategoryCount]) categories!: SearchCategoryCount[];
  @Field(() => Int) total!: number;
}
@Resolver()
@UseGuards(OptionalViewerJwtGuard)
export class SharedSearchResolver {
  constructor(
    @Inject(RESEARCH_SEARCH_SOURCE)
    private readonly research: ResearchSearchSource,
    @Inject(NEWS_SEARCH_SOURCE) private readonly news: NewsSearchSource,
  ) {}

  @Query(() => SearchPage)
  async search(
    @Context() context: { req: { user?: AuthenticatedUser } },
    @Args('term') term: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 20 }) pageSize: number,
    @Args('source', {
      type: () => SharedSearchSource,
      defaultValue: SharedSearchSource.NEWS,
    })
    source: SharedSearchSource,
  ): Promise<SearchPage> {
    if (
      !term.trim() ||
      term.trim().length > 100 ||
      page < 1 ||
      pageSize < 1 ||
      pageSize > 50
    ) {
      throw new BadRequestException('Invalid search query.');
    }
    const query = {
      term,
      page,
      pageSize,
      viewerId: context.req.user?.id,
    };
    const result =
      source === SharedSearchSource.RESEARCH_LAB
        ? await this.research.search(query)
        : await this.news.searchArticles(query);
    return {
      ...result,
      items: result.items.map((item) => ({ ...item, source })),
    };
  }
}
