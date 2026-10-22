import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';
import { NewsSettingsService } from '../../application/services/news-settings.service';
import type { NewsSettings } from '../../domain/types/news-settings.type';
import { UpdateNewsSettingsInput } from './inputs/update-news-settings.input';
import { NewsSettingsModel } from './models/news-settings.model';

@Resolver(() => NewsSettingsModel)
export class NewsSettingsResolver {
  constructor(private readonly settingsService: NewsSettingsService) {}

  @Query(() => NewsSettingsModel)
  newsSettings(): Promise<NewsSettings> {
    return this.settingsService.settings();
  }

  @Mutation(() => NewsSettingsModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.NewsSettingsManage)
  updateNewsSettings(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: UpdateNewsSettingsInput,
  ): Promise<NewsSettings> {
    return this.settingsService.update(actor.id, input);
  }
}
