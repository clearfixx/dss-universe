/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: Authorization
 * 📄 File: authorization.module.ts
 *
 * 🎯 Purpose:
 * Assembles the permission-based authorization infrastructure.
 *
 * 🧠 Responsibilities:
 * • registers PermissionsGuard;
 * • registers PermissionsService;
 * • registers PermissionsRepository;
 * • exposes AuthorizationTestController for development verification.
 *
 * 🏗️ Architecture:
 * Core authorization module.
 *
 * Authenticated request
 *   ↓
 * PermissionsGuard
 *   ↓
 * Permission metadata
 *   ↓
 * Controller
 *
 * ⚠️ Important:
 * PrismaModule is required by PermissionsRepository for database access.
 *
 * 💡 Notes:
 * If Nest says "can't resolve dependencies",
 * check module imports. It is not angry. It is just very literal. 😄
 *
 * 🚀 Build. Share. Grow.
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
