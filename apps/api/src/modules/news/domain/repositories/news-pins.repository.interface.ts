import type { NewsPin, SetNewsPin } from '../types/news-pin.type';

export const NEWS_PINS_REPOSITORY = Symbol('NEWS_PINS_REPOSITORY');

export interface NewsPinsRepository {
  set(input: SetNewsPin): Promise<NewsPin>;
  remove(articleId: string, actorId: string): Promise<boolean>;
}
