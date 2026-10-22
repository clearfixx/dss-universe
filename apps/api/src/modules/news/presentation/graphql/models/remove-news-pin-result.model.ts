/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/models/remove-news-pin-result.model.ts
 * 🎯 Purpose: Defines the existing pin removal result projection.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('RemoveNewsPinResult')
export class RemoveNewsPinResultModel {
  @Field() success!: boolean;
}
