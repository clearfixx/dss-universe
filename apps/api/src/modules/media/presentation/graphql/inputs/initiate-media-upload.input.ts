/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/presentation/graphql/inputs/initiate-media-upload.input.ts
 *
 * 🎯 Purpose:
 * Defines validated GraphQL input for a Media upload handshake.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import type { MediaUploadPolicyKey } from '../../../domain/types/media-upload-policy.type';

const MEDIA_UPLOAD_POLICY_KEYS: readonly MediaUploadPolicyKey[] = [
  'avatar',
  'cover',
  'content-image',
  'attachment',
];

@InputType()
export class InitiateMediaUploadInput {
  @Field(() => String)
  @IsIn(MEDIA_UPLOAD_POLICY_KEYS)
  policyKey!: MediaUploadPolicyKey;

  @Field()
  @IsString()
  @MaxLength(255)
  originalFilename!: string;

  @Field()
  @IsString()
  @MaxLength(127)
  declaredMimeType!: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  declaredSize!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  checksum?: string;
}
