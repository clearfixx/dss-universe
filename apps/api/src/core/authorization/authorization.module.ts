/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization
 * 📄 File: authorization.module.ts
 *
 * 🎯 Purpose:
 * Збирає інфраструктуру permission-based authorization.
 *
 * 📦 Contains:
 * • PermissionsGuard;
 * • PermissionsService;
 * • PermissionsRepository;
 * • AuthorizationTestController.
 *
 * 🔗 Dependencies:
 * PrismaModule потрібен репозиторію для доступу до БД.
 *
 * 🛰️ Якщо Nest знову скаже "can't resolve dependencies" —
 * перевір imports. Він не злий, він просто педант. 😄
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { PrismaModule } from '@api/core/database';

import { AuthorizationTestController } from './authorization-test.controller';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionsRepository } from './repositories/permissions.repository';
import { PermissionsService } from './services/permissions.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuthorizationTestController],
  providers: [PermissionsGuard, PermissionsService, PermissionsRepository],
  exports: [PermissionsGuard, PermissionsService, PermissionsRepository],
})
export class AuthorizationModule {}
