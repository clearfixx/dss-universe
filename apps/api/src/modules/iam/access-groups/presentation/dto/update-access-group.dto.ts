/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/access-groups/presentation/dto/update-access-group.dto.ts
 *
 * 🎯 Purpose:
 * Defines mutable appearance/availability only, never identity or authority.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
export class UpdateAccessGroupDto {
  @IsOptional() @IsString() @Length(1, 96) displayName?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @Matches(/^#[0-9a-fA-F]{6}$/) color?: string | null;
  @IsOptional() @IsString() @MaxLength(64) badgeLabel?: string | null;
  @IsOptional() @Matches(/^[a-z][a-z0-9-]{0,63}$/) icon?: string | null;
}
