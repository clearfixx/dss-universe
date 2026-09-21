import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';

import { Permission, PermissionsService } from '@api/core/authorization';
import {
  NEWS_SETTINGS_REPOSITORY,
  type NewsSettingsRepository,
} from '../../domain/repositories/news-settings.repository.interface';
import {
  NEWS_PAGINATION_MODES,
  type NewsPaginationMode,
  type NewsSettings,
} from '../../domain/types/news-settings.type';

export type UpdateNewsSettingsRequest = Omit<NewsSettings, 'updatedAt'>;

@Injectable()
export class NewsSettingsService {
  constructor(
    @Inject(NEWS_SETTINGS_REPOSITORY)
    private readonly settingsRepository: NewsSettingsRepository,
    private readonly permissions: PermissionsService,
  ) {}

  settings(): Promise<NewsSettings> {
    return this.settingsRepository.get();
  }

  async update(
    actorId: string,
    input: UpdateNewsSettingsRequest,
  ): Promise<NewsSettings> {
    const profile = await this.permissions.getAccessProfileByUserId(actorId);
    if (!profile.permissions.includes(Permission.NewsSettingsManage)) {
      throw new ForbiddenException(
        `Missing permission: ${Permission.NewsSettingsManage}.`,
      );
    }
    this.mode(input.newsPaginationMode);
    this.mode(input.commentsPaginationMode);
    this.integer(input.newsPaginationThreshold, 1, 500, 'News threshold');
    this.integer(input.newsPageSize, 1, 100, 'News page size');
    this.integer(
      input.commentsPaginationThreshold,
      1,
      500,
      'Comment threshold',
    );
    this.integer(input.commentsPageSize, 1, 100, 'Comment page size');
    return this.settingsRepository.update({ ...input, actorId });
  }

  private mode(mode: NewsPaginationMode): void {
    if (!NEWS_PAGINATION_MODES.includes(mode)) {
      throw new BadRequestException('News pagination mode is invalid.');
    }
  }

  private integer(
    value: number,
    minimum: number,
    maximum: number,
    label: string,
  ): void {
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
      throw new BadRequestException(
        `${label} must be an integer between ${minimum} and ${maximum}.`,
      );
    }
  }
}
