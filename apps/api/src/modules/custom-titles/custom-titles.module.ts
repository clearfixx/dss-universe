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
  exports: [CustomTitlesService],
})
export class CustomTitlesModule {}

/**
 * This module owns titles, not ranks, roles, groups, or permissions.
 */
