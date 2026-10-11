/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/types/safe-user.type.ts
 *
 * 🎯 Purpose:
 * Defines the safe user shape that may leave the internal persistence boundary.
 *
 * ⚠️ Important:
 * SafeUser must never contain authentication secrets such as passwordHash
 * or refreshTokenHash.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { ViewerProfile } from '../../contracts/viewer-profile.contract';

export type SafeUser = ViewerProfile;
