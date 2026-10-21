/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/presentation/graphql/inputs/update-custom-title.input.ts
 *
 * 🎯 Purpose:
 * Defines the GraphQL contract for updating or archiving a custom title.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsHexColor,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

@InputType()
export class UpdateCustomTitleInput {
  @Field(() => ID)
  @IsString()
  id!: string;

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

  @Field()
  @IsBoolean()
  isActive!: boolean;
}

/**
 * Archiving changes availability, never historical grants.
 */
