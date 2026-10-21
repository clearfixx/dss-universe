/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/access-groups/presentation/dto/create-access-group.dto.ts
 *
 * 🎯 Purpose:
 * Defines validated transport fields for a custom non-staff access group.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import type { AccessCapability } from '../../domain/access-group.types';
export class CreateAccessGroupDto {
  @Matches(/^[a-z][a-z0-9-]{0,63}$/) key!: string;
  @IsString() @Length(1, 96) displayName!: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/) color?: string;
  @IsOptional() @IsString() @MaxLength(64) badgeLabel?: string;
  @IsOptional() @Matches(/^[a-z][a-z0-9-]{0,63}$/) icon?: string;
  @IsArray()
  @ArrayMaxSize(1)
  @ArrayUnique()
  @IsIn(['KNOWLEDGE_FORGE_GUARDIAN'], { each: true })
  capabilities!: AccessCapability[];
}
