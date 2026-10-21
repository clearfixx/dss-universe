import type {
  CreateNewsDraft,
  NewsArticle,
  NewsEditorialListPage,
  NewsEditorialListQuery,
  SaveNewsDraft,
} from '../types/news-article.type';

export const NEWS_REPOSITORY = Symbol('NEWS_REPOSITORY');

export interface NewsRepository {
  createDraft(input: CreateNewsDraft): Promise<NewsArticle>;
  findById(id: string): Promise<NewsArticle | null>;
  findBySlug(language: string, slug: string): Promise<NewsArticle | null>;
  listEditorial(input: NewsEditorialListQuery): Promise<NewsEditorialListPage>;
  saveDraft(input: SaveNewsDraft): Promise<NewsArticle | null>;
}
