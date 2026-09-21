import type {
  CreateNewsCategory,
  CreateNewsFieldDefinition,
  CreateNewsTag,
  NewsCategory,
  NewsFieldDefinition,
  NewsTag,
} from '../types/news-taxonomy.type';
import type { NewsPostType } from '../types/news-article.type';

export const NEWS_TAXONOMY_REPOSITORY = Symbol('NEWS_TAXONOMY_REPOSITORY');

export interface NewsTaxonomyRepository {
  createCategory(input: CreateNewsCategory): Promise<NewsCategory>;
  createTag(input: CreateNewsTag): Promise<NewsTag>;
  createFieldDefinition(
    input: CreateNewsFieldDefinition,
  ): Promise<NewsFieldDefinition>;
  categoryExists(id: string): Promise<boolean>;
  scopeFieldKeyExists(
    categoryId: string | null,
    postType: NewsPostType | null,
    key: string,
  ): Promise<boolean>;
}
