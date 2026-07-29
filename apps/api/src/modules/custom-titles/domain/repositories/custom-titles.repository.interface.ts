/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/domain/repositories/custom-titles.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines persistence boundaries for title lifecycle, grants, and selection.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  CreateCustomTitle,
  CustomTitle,
  CustomTitleSettings,
  TitleGrantResult,
  TitleRevokeResult,
  TitleSelectionResult,
  TitleWriteResult,
  UpdateCustomTitle,
  UserTitleGrant,
} from '../types/custom-titles.type';

export const CUSTOM_TITLES_REPOSITORY = Symbol('CUSTOM_TITLES_REPOSITORY');

export interface CustomTitlesRepository {
  definitions(includeInactive: boolean): Promise<CustomTitle[]>;
  create(input: CreateCustomTitle): Promise<TitleWriteResult<CustomTitle>>;
  update(input: UpdateCustomTitle): Promise<TitleWriteResult<CustomTitle>>;
  grants(userId: string, includeRevoked: boolean): Promise<UserTitleGrant[]>;
  grant(
    userId: string,
    titleId: string,
    reason: string,
    actorId: string,
  ): Promise<TitleGrantResult>;
  revoke(
    grantId: string,
    reason: string,
    actorId: string,
  ): Promise<TitleRevokeResult>;
  select(userId: string, grantId: string): Promise<TitleSelectionResult>;
  settings(): Promise<CustomTitleSettings>;
  updateSettings(
    selectionCooldownDays: number,
    actorId: string,
  ): Promise<CustomTitleSettings>;
}

/**
 * Grants have a revoke operation, but deliberately no delete operation.
 */
