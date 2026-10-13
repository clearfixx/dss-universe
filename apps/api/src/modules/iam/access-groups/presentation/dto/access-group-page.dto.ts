/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/access-groups/presentation/dto/access-group-page.dto.ts
 *
 * 🎯 Purpose:
 * Defines bounded cursor pagination for administrative access-group reads.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
export class AccessGroupPageDto {
  @IsOptional() @IsUUID() after?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
