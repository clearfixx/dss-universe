import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  GraphQLISODateTime,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from '@nestjs/graphql';
import { IsEnum, IsInt, Max, Min } from 'class-validator';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';
import { NewsSettingsService } from '../../application/services/news-settings.service';
import type { NewsSettings } from '../../domain/types/news-settings.type';

export enum NewsPaginationModeModel {
  DISABLED = 'DISABLED',
  PAGES = 'PAGES',
  LOAD_MORE = 'LOAD_MORE',
  BOTH = 'BOTH',
}

registerEnumType(NewsPaginationModeModel, { name: 'NewsPaginationMode' });

@ObjectType('NewsSettings')
export class NewsSettingsModel {
  @Field(() => NewsPaginationModeModel)
  newsPaginationMode!: NewsPaginationModeModel;

  @Field(() => Int)
  newsPaginationThreshold!: number;

  @Field(() => Int)
  newsPageSize!: number;

  @Field(() => NewsPaginationModeModel)
  commentsPaginationMode!: NewsPaginationModeModel;

  @Field(() => Int)
  commentsPaginationThreshold!: number;

  @Field(() => Int)
  commentsPageSize!: number;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

@InputType()
export class UpdateNewsSettingsInput {
  @Field(() => NewsPaginationModeModel)
  @IsEnum(NewsPaginationModeModel)
  newsPaginationMode!: NewsPaginationModeModel;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(500)
  newsPaginationThreshold!: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(100)
  newsPageSize!: number;

  @Field(() => NewsPaginationModeModel)
  @IsEnum(NewsPaginationModeModel)
  commentsPaginationMode!: NewsPaginationModeModel;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(500)
  commentsPaginationThreshold!: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(100)
  commentsPageSize!: number;
}

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
