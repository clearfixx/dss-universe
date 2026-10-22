/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/models/managed-news-pin.model.ts
 * 🎯 Purpose: Defines the existing managed pin result projection.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { NewsPinScopeModel } from './news-pin-scope.model';

@ObjectType('ManagedNewsPin')
export class ManagedNewsPinModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) articleId!: string;
  @Field(() => NewsPinScopeModel) scope!: NewsPinScopeModel;
  @Field(() => ID, { nullable: true }) categoryId!: string | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) expiresAt!: Date | null;
  @Field(() => ID) pinnedById!: string;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
}
