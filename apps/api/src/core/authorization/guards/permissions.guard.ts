/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: Authorization
 * 📄 File: permissions.guard.ts
 *
 * 🎯 Purpose:
 * Blocks HTTP requests when the authenticated user lacks required permissions.
 *
 * 🧠 Responsibilities:
 * • reads required permissions from route metadata;
 * • reads effective permissions from request.user;
 * • allows or rejects the request before it reaches the controller.
 *
 * 🏗️ Architecture:
 * Authorization guard.
 *
 * Request
 *   ↓
 * JwtAuthGuard
 *   ↓
 * PermissionsGuard
 *   ↓
 * Controller
 *
 * ⚠️ Important:
 * Frontend may hide a button.
 * Backend decides whether the action is allowed.
 *
 * 💡 Notes:
 * If this guard stopped the request,
 * it probably prevented a very bad day. 🛡️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

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

    const request =
      context.getType<string>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext<{
            req: AuthenticatedRequest;
          }>().req
        : context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication is required.');
    }

    const userPermissions = new Set<string>(user.permissions);

    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.has(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions.');
    }

    return true;
  }
}
