/**
 * DSS File Passport 🛰️
 * File: apps/api/src/core/auth/decorators/authenticated.decorator.ts
 * Purpose: Composes authentication and optional legacy role guards.
 * Phase: 2.5.9 — Architecture Cleanup
 * Architecture: Auth decorator
 *
 * Notes:
 * - Prefer JwtAuthGuard + PermissionsGuard + RequirePermissions for new code.
 * - Role-based access remains only as a compatibility bridge.
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
