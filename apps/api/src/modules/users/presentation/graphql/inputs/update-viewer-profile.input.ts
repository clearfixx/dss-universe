/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/inputs/update-viewer-profile.input.ts
 *
 * 🎯 Purpose:
 * Defines validated owner-controlled profile foundation updates.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

@InputType()
export class UpdateViewerProfileInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  website?: string | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  technologies?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  interests?: string[];
}
