import type { ShortNewsPage, ShortNewsQuery } from '../types/short-news.type';

export const NEWS_DELIVERY_REPOSITORY = Symbol('NEWS_DELIVERY_REPOSITORY');

export interface NewsDeliveryRepository {
  browseShort(input: ShortNewsQuery): Promise<ShortNewsPage>;
}
