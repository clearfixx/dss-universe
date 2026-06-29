/**
 * DSS File Passport 🛰️
 * File: apps/api/src/core/auth/guards/roles.guard.ts
 * Purpose: Guard for role-based route access.
 * Phase: 2.4.5 — RBAC Core Migration
 * Architecture: Auth guard
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from '../types/authenticated-request.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication is required.');
    }

    const userRoles = (user.roles ?? []).map((role) => role.toLowerCase());

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
