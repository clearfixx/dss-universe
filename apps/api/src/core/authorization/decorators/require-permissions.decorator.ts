/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization
 * 📄 File: require-permissions.decorator.ts
 *
 * 🎯 Purpose:
 * Defines required permission metadata for protected routes.
 *
 * 🧠 Responsibilities:
 * • stores permission requirements on route handlers;
 * • provides metadata consumed by PermissionsGuard;
 * • keeps controller authorization declarations readable.
 *
 * 🏗️ Architecture:
 * Authorization decorator. Does not perform access checks directly.
 *
 * ⚠️ Important:
 * This decorator declares requirements.
 * PermissionsGuard enforces them.
 *
 * 💡 Notes:
 * A decorator writes the rule.
 * A guard makes sure nobody ignores it. 🛡️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { SetMetadata } from '@nestjs/common';

import type { PermissionKey } from '../enums/permission.registry';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
