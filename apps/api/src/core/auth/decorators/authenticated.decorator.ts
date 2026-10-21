/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🔐 Module: Authentication
 * 📄 File: authenticated.decorator.ts
 *
 * 🎯 Purpose:
 * Composes JWT authentication and optional legacy role protection.
 *
 * 🧠 Responsibilities:
 * • applies JwtAuthGuard;
 * • applies RolesGuard for legacy role checks;
 * • attaches role metadata when roles are provided.
 *
 * 🏗️ Architecture:
 * Convenience auth decorator.
 *
 * ⚠️ Important:
 * Prefer JwtAuthGuard + PermissionsGuard + RequirePermissions for new code.
 * This decorator remains as a compatibility bridge.
 *
 * 💡 Notes:
 * Useful shortcut. Not a security philosophy. 🛰️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { applyDecorators, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

export const Authenticated = (...roles: string[]) => {
  const decorators = [UseGuards(JwtAuthGuard, RolesGuard)];

  if (roles.length > 0) {
    decorators.push(Roles(...roles));
  }

  return applyDecorators(...decorators);
};
