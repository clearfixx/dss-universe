/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/models/news-delivery.enums.ts
 * 🎯 Purpose: Registers existing News delivery wire enums.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { registerEnumType } from '@nestjs/graphql';

export enum NewsPostTypeModel {
  STANDARD = 'STANDARD',
  TEXT = 'TEXT',
  GALLERY = 'GALLERY',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
}

export enum NewsVisibilityModel {
  PUBLIC = 'PUBLIC',
  MEMBERS = 'MEMBERS',
}

export enum NewsVoteKindModel {
  UPVOTE = 'UPVOTE',
  DOWNVOTE = 'DOWNVOTE',
}

export enum NewsShareChannelModel {
  FACEBOOK = 'FACEBOOK',
  X = 'X',
  THREADS = 'THREADS',
  INSTAGRAM = 'INSTAGRAM',
  PINTEREST = 'PINTEREST',
  COPY_LINK = 'COPY_LINK',
  PRINT = 'PRINT',
}

registerEnumType(NewsPostTypeModel, { name: 'NewsPostType' });
registerEnumType(NewsVisibilityModel, { name: 'NewsVisibility' });
registerEnumType(NewsVoteKindModel, { name: 'NewsVoteKind' });
registerEnumType(NewsShareChannelModel, { name: 'NewsShareChannel' });
