/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/access-groups/application/access-group.validation.ts
 *
 * 🎯 Purpose:
 * Validates group policy independently of transport decorators and persistence.
 *
 * 🧠 Responsibilities:
 * • bounds canonical keys, appearance and closed capability values;
 * • validates UTC validity intervals independently of HTTP decorators;
 * • rejects invalid administrative pagination.
 *
 * 🏗️ Architecture:
 * Pure IAM application validation; no persistence or cross-module reads.
 *
 * ⚠️ Important:
 * Display metadata cannot grant authority. Unknown capabilities fail closed.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException } from '@nestjs/common';
import type {
  AccessCapability,
  CreateAccessGroup,
  UpdateAccessGroup,
  GrantAccessMembership,
} from '../domain/access-group.types';
const KEY = /^[a-z][a-z0-9-]{0,63}$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;
export function validateCapabilities(
  values: readonly AccessCapability[],
): void {
  if (
    !Array.isArray(values) ||
    values.length > 1 ||
    values.some((key) => key !== 'KNOWLEDGE_FORGE_GUARDIAN')
  )
    throw new BadRequestException(
      'Only the reviewed Knowledge Forge Guardian capability can be delegated.',
    );
}
function validateAppearance(input: UpdateAccessGroup): void {
  if (
    input.displayName !== undefined &&
    (typeof input.displayName !== 'string' ||
      !input.displayName.trim() ||
      input.displayName.length > 96)
  )
    throw new BadRequestException('A bounded group display name is required.');
  if (input.enabled !== undefined && typeof input.enabled !== 'boolean')
    throw new BadRequestException('enabled must be boolean.');
  if (input.isPublic !== undefined && typeof input.isPublic !== 'boolean')
    throw new BadRequestException('isPublic must be boolean.');
  if (
    input.color !== undefined &&
    input.color !== null &&
    !COLOR.test(input.color)
  )
    throw new BadRequestException('Use a six-digit hexadecimal color.');
  if (input.icon !== undefined && input.icon !== null && !KEY.test(input.icon))
    throw new BadRequestException('Use a bounded icon key.');
  if (
    input.badgeLabel !== undefined &&
    input.badgeLabel !== null &&
    (typeof input.badgeLabel !== 'string' || input.badgeLabel.length > 64)
  )
    throw new BadRequestException('Badge label is too long.');
}
export function validateCreateGroup(input: CreateAccessGroup): void {
  if (
    typeof input.key !== 'string' ||
    !KEY.test(input.key) ||
    input.key === 'premium'
  )
    throw new BadRequestException(
      'Use a unique non-reserved access group key.',
    );
  if (!input.displayName)
    throw new BadRequestException('Group display name is required.');
  validateAppearance(input);
  validateCapabilities(input.capabilities);
}
export function validateUpdateGroup(input: UpdateAccessGroup): void {
  validateAppearance(input);
}
export function validateGrant(input: GrantAccessMembership): void {
  if (
    typeof input.subjectId !== 'string' ||
    !input.subjectId.trim() ||
    typeof input.groupId !== 'string' ||
    !input.groupId.trim() ||
    !(input.validFrom instanceof Date) ||
    !Number.isFinite(input.validFrom.getTime()) ||
    (input.validUntil !== null &&
      (!(input.validUntil instanceof Date) ||
        !Number.isFinite(input.validUntil.getTime()) ||
        input.validUntil <= input.validFrom))
  )
    throw new BadRequestException(
      'Membership requires a subject, group and increasing validity interval.',
    );
}
export function validatePage(limit: number): void {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
    throw new BadRequestException('Page size must be between 1 and 100.');
}
