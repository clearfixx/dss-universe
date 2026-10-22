/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/models/news-pin-scope.model.ts
 * 🎯 Purpose: Registers the existing News pin-scope wire enum.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { registerEnumType } from '@nestjs/graphql';

export enum NewsPinScopeModel {
  GLOBAL = 'GLOBAL',
  CATEGORY = 'CATEGORY',
}

registerEnumType(NewsPinScopeModel, { name: 'NewsPinScope' });
