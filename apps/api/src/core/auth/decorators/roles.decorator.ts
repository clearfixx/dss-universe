/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🔐 Module: Authentication
 * 📄 File: roles.decorator.ts
 *
 * 🎯 Purpose:
 * Defines legacy role metadata for route protection.
 *
 * 🧠 Responsibilities:
 * • stores required role names on route handlers;
 * • provides metadata consumed by RolesGuard;
 * • keeps old role-based protection compatible during migration.
 *
 * 🏗️ Architecture:
 * Legacy auth decorator.
 *
 * ⚠️ Important:
 * New backend authorization should prefer permissions.
 * Roles are containers for permissions, not the final source of truth.
 *
 * 💡 Notes:
 * If you are adding a new protected endpoint,
 * reach for RequirePermissions first. 🛡️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { SetMetadata } from '@nestjs/common';

import { ROLES_KEY } from '../constants/roles.constant';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
