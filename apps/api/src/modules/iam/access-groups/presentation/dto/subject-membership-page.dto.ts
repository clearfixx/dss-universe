/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/access-groups/presentation/dto/subject-membership-page.dto.ts
 *
 * 🎯 Purpose:
 * Defines bounded membership history queries for one opaque subject.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { IsUUID } from 'class-validator';
import { AccessGroupPageDto } from './access-group-page.dto';
export class SubjectMembershipPageDto extends AccessGroupPageDto {
  @IsUUID() subjectId!: string;
}
