/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: Authorization
 * 📄 File: apps/api/src/core/authorization/authorization.module.ts
 *
 * 🎯 Purpose:
 * Assembles the permission-based authorization infrastructure.
 *
 * 🧠 Responsibilities:
 * • registers PermissionsGuard;
 * • registers PermissionsService;
 * • registers PermissionsRepository;
 * • publishes current subject access through a narrow read capability;
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
 * Assignment inputs are wired at the root; this module owns decisions, not IAM persistence.
 *
 * 💡 Notes:
 * If Nest says "can't resolve dependencies",
 * check module imports. It is not angry. It is just very literal. 😄
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { AdminCommandDeckResolver } from './admin-command-deck.resolver';
import { AuthorizationTestController } from './authorization-test.controller';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionsRepository } from './repositories/permissions.repository';
import { PermissionsService } from './services/permissions.service';
import { SUBJECT_ACCESS_READER } from './contracts/subject-access-reader.interface';
import { ACCESS_CAPABILITY_DECISIONS } from './contracts/access-capability-decisions.contract';
import { AccessCapabilityDecisionsService } from './services/access-capability-decisions.service';

@Module({
  controllers: [AuthorizationTestController],
  providers: [
    PermissionsGuard,
    AdminCommandDeckResolver,
    PermissionsService,
    PermissionsRepository,
    AccessCapabilityDecisionsService,
    {
      provide: ACCESS_CAPABILITY_DECISIONS,
      useExisting: AccessCapabilityDecisionsService,
    },
    { provide: SUBJECT_ACCESS_READER, useExisting: PermissionsService },
  ],
  exports: [
    PermissionsGuard,
    PermissionsService,
    PermissionsRepository,
    SUBJECT_ACCESS_READER,
    ACCESS_CAPABILITY_DECISIONS,
  ],
})
export class AuthorizationModule {}
