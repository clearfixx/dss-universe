/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/models/news-editorial.enums.ts
 * 🎯 Purpose: Registers existing News editorial wire enums.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { registerEnumType } from '@nestjs/graphql';

export enum NewsArticleStatusModel {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum NewsEditorialActionModel {
  SUBMITTED = 'SUBMITTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  SCHEDULE_CANCELLED = 'SCHEDULE_CANCELLED',
  PUBLISHED = 'PUBLISHED',
}

registerEnumType(NewsArticleStatusModel, { name: 'NewsArticleStatus' });
registerEnumType(NewsEditorialActionModel, { name: 'NewsEditorialAction' });
