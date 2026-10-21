import type {
  NewsInternalLink,
  NewsInternalLinkType,
} from '../types/news-links.type';

export const NEWS_LINKS_REPOSITORY = Symbol('NEWS_LINKS_REPOSITORY');

export interface NewsLinksRepository {
  create(input: {
    sourceArticleId: string;
    targetArticleId: string;
    type: NewsInternalLinkType;
    anchorText: string;
    position: number;
    actorId: string;
  }): Promise<NewsInternalLink | null>;
  list(sourceArticleId: string): Promise<NewsInternalLink[]>;
  remove(linkId: string, actorId: string): Promise<boolean>;
}
