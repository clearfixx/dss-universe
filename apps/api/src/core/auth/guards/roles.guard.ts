/**
 * DSS File Passport 🛰️
 * File: apps/api/src/core/auth/guards/roles.guard.ts
 * Purpose: Legacy guard for role-based route access.
 * Phase: 2.5.9 — Architecture Cleanup
 * Architecture: Auth guard
 *
 * Notes:
 * - Prefer PermissionsGuard for new backend authorization.
 * - Roles are useful for grouping permissions, not for final access checks.
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../constants/roles.constant';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication is required.');
    }

    const userRoles = user.roles.map((role) => role.toLowerCase());

    const normalizedRequiredRoles = requiredRoles.map((role) =>
      role.toLowerCase(),
    );

    const hasRequiredRole = normalizedRequiredRoles.some((role) =>
      userRoles.includes(role),
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException('Insufficient role.');
    }

    return true;
  }
}
