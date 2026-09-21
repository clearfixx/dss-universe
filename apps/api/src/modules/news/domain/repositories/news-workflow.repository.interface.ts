import type {
  NewsEditorialTransition,
  NewsEditorialTransitionResult,
} from '../types/news-editorial.type';

export const NEWS_WORKFLOW_REPOSITORY = Symbol('NEWS_WORKFLOW_REPOSITORY');

export interface NewsWorkflowRepository {
  transition(
    input: NewsEditorialTransition,
  ): Promise<NewsEditorialTransitionResult | null>;
}
