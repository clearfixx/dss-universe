/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization
 * 📄 File: permissions.guard.ts
 *
 * 🛡️ Purpose:
 * Зупиняє HTTP-запит, якщо користувач не має потрібних permission'ів.
 *
 * 🔄 Flow:
 * Request
 *   ↓
 * JwtAuthGuard
 *   ↓
 * PermissionsGuard
 *   ↓
 * Controller
 *
 * ⚠️ Security:
 * Frontend може приховати кнопку.
 * Але тільки backend вирішує, чи дія дозволена.
 *
 * 🛸 Mission:
 * Захищає DSS Universe від "та я ж адмін, чесно". 😄
 * ===============================================================
 */
/**
 * DSS File Passport 🛰️
 * File: apps/api/src/core/authorization/guards/permissions.guard.ts
 * Purpose: Guards routes by required permissions.
 * Phase: 2.5 — Roles & Permission Management
 * Architecture: Authorization guard
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedRequest } from '@api/core/auth';

import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { PermissionKey } from '../enums/permission.registry';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionKey[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication is required.');
    }

    const userPermissions = user.permissions ?? [];

    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions.');
    }

    return true;
  }
}
