/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/models/news-pagination-mode.model.ts
 * 🎯 Purpose: Registers the existing News pagination wire enum.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { registerEnumType } from '@nestjs/graphql';

export enum NewsPaginationModeModel {
  DISABLED = 'DISABLED',
  PAGES = 'PAGES',
  LOAD_MORE = 'LOAD_MORE',
  BOTH = 'BOTH',
}

registerEnumType(NewsPaginationModeModel, { name: 'NewsPaginationMode' });
