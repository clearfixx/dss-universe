/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/access-groups/presentation/dto/set-access-capabilities.dto.ts
 *
 * 🎯 Purpose:
 * Defines the closed reviewed delegation list; arbitrary permission keys are invalid.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn } from 'class-validator';
import type { AccessCapability } from '../../domain/access-group.types';
export class SetAccessCapabilitiesDto {
  @IsArray()
  @ArrayMaxSize(1)
  @ArrayUnique()
  @IsIn(['KNOWLEDGE_FORGE_GUARDIAN'], { each: true })
  capabilities!: AccessCapability[];
}
