/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/access-groups/presentation/dto/grant-access-membership.dto.ts
 *
 * 🎯 Purpose:
 * Defines membership interval transport without actor or permission input.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { IsISO8601, IsOptional, IsUUID, Matches } from 'class-validator';
export class GrantAccessMembershipDto {
  @IsUUID() subjectId!: string;
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(
    /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/,
  )
  validFrom?: string;
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(
    /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/,
  )
  validUntil?: string | null;
}
