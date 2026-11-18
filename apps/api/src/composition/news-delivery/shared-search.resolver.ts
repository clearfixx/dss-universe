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
import { PrismaNewsSearchSession } from '@api/modules/news/infrastructure';

@ObjectType()
class SearchHit {
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
  constructor(private readonly news: PrismaNewsSearchSession) {}

  @Query(() => SearchPage)
  async search(
    @Context() context: { req: { user?: AuthenticatedUser } },
    @Args('term') term: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 20 }) pageSize: number,
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
    const result = await this.news.searchArticles({
      term,
      page,
      pageSize,
      viewerId: context.req.user?.id,
    });
    return {
      ...result,
      items: result.items.map((item) => ({ ...item, source: 'NEWS' })),
    };
  }
}
