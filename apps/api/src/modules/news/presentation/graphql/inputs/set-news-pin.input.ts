/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/inputs/set-news-pin.input.ts
 * 🎯 Purpose: Defines the existing News pin command input.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, GraphQLISODateTime, ID, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { NewsPinScopeModel } from '../models/news-pin-scope.model';

@InputType()
export class SetNewsPinInput {
  @Field(() => ID) @IsUUID() articleId!: string;
  @Field(() => NewsPinScopeModel)
  @IsEnum(NewsPinScopeModel)
  scope!: NewsPinScopeModel;
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  expiresAt?: Date;
}
