/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/presentation/graphql/inputs/create-custom-title.input.ts
 *
 * 🎯 Purpose:
 * Defines the GraphQL contract for creating a custom title.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType } from '@nestjs/graphql';
import {
  IsHexColor,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

@InputType()
export class CreateCustomTitleInput {
  @Field()
  @IsString()
  @Length(2, 64)
  name!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Field()
  @IsHexColor()
  color!: string;

  @Field()
  @IsString()
  @Length(1, 64)
  badge!: string;
}

/**
 * The API accepts the badge. The title service keeps it powerless.
 */
