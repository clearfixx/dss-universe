/* * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization
 * 📄 File: permissions.service.ts
 *
 * 🧠 Призначення:
 * Єдине місце, яке знає, які права має користувач.
 *
 * 🏗️ Архітектурна примітка:
 * Не перевіряємо ролі напряму.
 * Роль = "погон".
 * Permission = реальне право.
 *
 * 💡 Примітка на майбутнє:
 * Якщо виникла думка написати:
 *     if (user.role === 'ADMIN')
 * ...то десь заплакав один архітектор. 😄
 *
 * ☕ Гарного дня тому, хто відкрив цей файл.
 * ===============================================================*/

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization
 * 📄 File: permissions.service.ts
 *
 * 🎯 Purpose:
 * Центральний сервіс перевірки permission'ів.
 *
 * 🧠 Responsibilities:
 * • отримує permission'и користувача через repository;
 * • перевіряє, чи має користувач потрібні права;
 * • приховує деталі джерела даних від Guard.
 *
 * 🏗️ Architecture:
 * PermissionsGuard
 *   ↓
 * PermissionsService
 *   ↓
 * PermissionsRepository
 *   ↓
 * Prisma
 *
 * ⚠️ Important:
 * Не перевіряємо ролі напряму в контролерах.
 * Backend приймає рішення через permission'и.
 *
 * 💡 Future:
 * ▢ Redis cache;
 * ▢ permission inheritance;
 * ▢ dynamic role editor in Admin Panel.
 *
 *💡 Примітка на майбутнє:
 * Якщо виникла думка написати:
 *     if (user.role === 'ADMIN')
 * ...то десь заплакав один архітектор. 😄
 *
 * ☕ Гарного дня тому, хто відкрив цей файл.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { PermissionKey } from '../enums/permission.registry';
import { PermissionsRepository } from '../repositories/permissions.repository';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async getPermissionsByRoleNames(roleNames: string[]): Promise<string[]> {
    return this.permissionsRepository.findPermissionKeysByRoleNames(roleNames);
  }

  async hasAllPermissions(
    roleNames: string[],
    requiredPermissions: PermissionKey[],
  ): Promise<boolean> {
    const permissions = await this.getPermissionsByRoleNames(roleNames);

    return requiredPermissions.every((permission) =>
      permissions.includes(permission),
    );
  }

  async hasAnyPermission(
    roleNames: string[],
    requiredPermissions: PermissionKey[],
  ): Promise<boolean> {
    const permissions = await this.getPermissionsByRoleNames(roleNames);

    return requiredPermissions.some((permission) =>
      permissions.includes(permission),
    );
  }
}
