/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/presentation/graphql/models/media-library.model.ts
 *
 * 🎯 Purpose:
 * Defines Media Library connection and storage metric GraphQL contracts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';

import {
  MediaKind,
  MediaStatus,
  MediaVisibility,
} from '../enums/media-graphql.enums';

@ObjectType('MediaLibraryItem')
export class MediaLibraryItemModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, { nullable: true })
  ownerId!: string | null;

  @Field(() => MediaKind)
  kind!: MediaKind;

  @Field(() => MediaStatus)
  status!: MediaStatus;

  @Field(() => MediaVisibility)
  visibility!: MediaVisibility;

  @Field()
  originalFilename!: string;

  @Field()
  mimeType!: string;

  @Field()
  extension!: string;

  @Field(() => Int)
  size!: number;

  @Field(() => Int, { nullable: true })
  width!: number | null;

  @Field(() => Int, { nullable: true })
  height!: number | null;

  @Field(() => String, { nullable: true })
  failureCode!: string | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

@ObjectType('MediaLibraryPageInfo')
export class MediaLibraryPageInfoModel {
  @Field()
  hasNextPage!: boolean;

  @Field(() => String, { nullable: true })
  endCursor!: string | null;
}

@ObjectType('MediaLibraryConnection')
export class MediaLibraryConnectionModel {
  @Field(() => [MediaLibraryItemModel])
  items!: MediaLibraryItemModel[];

  @Field(() => MediaLibraryPageInfoModel)
  pageInfo!: MediaLibraryPageInfoModel;
}

@ObjectType('MediaLibraryMetrics')
export class MediaLibraryMetricsModel {
  @Field(() => Int)
  totalMedia!: number;

  @Field(() => Float)
  originalBytes!: number;

  @Field(() => Float)
  variantBytes!: number;

  @Field(() => Float)
  totalBytes!: number;

  @Field(() => Int)
  orphanedMedia!: number;

  @Field(() => Int)
  failedMedia!: number;

  @Field(() => Int)
  quarantinedMedia!: number;
}
