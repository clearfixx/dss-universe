/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/access-groups/presentation/dto/revoke-access-membership.dto.ts
 *
 * 🎯 Purpose:
 * Requires an attributable revocation reason, not mutation of grant history.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { IsString, Length } from 'class-validator';
export class RevokeAccessMembershipDto {
  @IsString() @Length(1, 500) reason!: string;
}
