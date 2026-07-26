/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/inputs/update-viewer-social-links.input.ts
 *
 * 🎯 Purpose:
 * Defines a bounded, validated social-link collection replacement.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Type } from 'class-transformer';
import { Field, InputType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

@InputType()
export class ViewerSocialLinkInput {
  @Field()
  @IsString()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_-]{1,31}$/)
  platform!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label?: string | null;

  @Field()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  url!: string;
}

@InputType()
export class UpdateViewerSocialLinksInput {
  @Field(() => [ViewerSocialLinkInput])
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ViewerSocialLinkInput)
  links!: ViewerSocialLinkInput[];
}
