/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/repositories/user-privacy.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines persistence operations for owner-controlled profile privacy policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  UpdateUserPrivacySettings,
  UserPrivacySettings,
} from '../types/user-privacy-settings.type';

export const USER_PRIVACY_REPOSITORY = Symbol('USER_PRIVACY_REPOSITORY');

export interface UserPrivacyRepository {
  findByUserId(userId: string): Promise<UserPrivacySettings | null>;
  upsert(
    userId: string,
    settings: UpdateUserPrivacySettings,
  ): Promise<UserPrivacySettings>;
}
