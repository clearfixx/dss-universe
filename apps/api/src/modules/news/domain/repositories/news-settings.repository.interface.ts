import type {
  NewsSettings,
  UpdateNewsSettings,
} from '../types/news-settings.type';

export const NEWS_SETTINGS_REPOSITORY = Symbol('NEWS_SETTINGS_REPOSITORY');

export interface NewsSettingsRepository {
  get(): Promise<NewsSettings>;
  update(input: UpdateNewsSettings): Promise<NewsSettings>;
}
