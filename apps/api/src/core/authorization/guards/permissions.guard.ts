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

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionKey } from '../enums/permission.registry';
import { PermissionsService } from '../services/permissions.service';
import type { AuthenticatedRequest } from '@api/core/auth';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionKey[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    const roleNames = user?.roles?.length
      ? user.roles
      : user?.role
        ? [user.role]
        : [];

    if (!roleNames.length) {
      throw new ForbiddenException('User roles were not found.');
    }

    if (!roleNames.length) {
      throw new ForbiddenException('User roles were not found.');
    }

    const hasAllPermissions = await this.permissionsService.hasAllPermissions(
      roleNames,
      requiredPermissions,
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions.');
    }

    return true;
  }
}
