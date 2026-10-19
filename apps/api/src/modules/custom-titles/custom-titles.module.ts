/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/custom-titles.module.ts
 *
 * 🎯 Purpose:
 * Wires the permission-neutral Custom Titles bounded context.
 *
 * 🧠 Responsibilities:
 * • assembles private title policy, persistence and GraphQL providers.
 *
 * 🏗️ Architecture:
 * Owner-local assembly; root composition supplies the published grant input port.
 *
 * ⚠️ Important:
 * Do not expose the broad title application service as an integration API.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { AuditModule } from '@api/core/audit';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';

import { CustomTitlesService } from './application/services/custom-titles.service';
import { CUSTOM_TITLES_REPOSITORY } from './domain/repositories/custom-titles.repository.interface';
import { PrismaCustomTitlesRepository } from './infrastructure/repositories/prisma-custom-titles.repository';
import { CustomTitlesResolver } from './presentation/graphql/resolvers/custom-titles.resolver';

@Module({
  imports: [PrismaModule, AuditModule, EventsModule],
  providers: [
    CustomTitlesService,
    CustomTitlesResolver,
    {
      provide: CUSTOM_TITLES_REPOSITORY,
      useClass: PrismaCustomTitlesRepository,
    },
  ],
  exports: [],
})
export class CustomTitlesModule {}

/**
 * This module owns titles, not ranks, roles, groups, or permissions.
 */
