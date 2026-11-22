/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/levels.module.ts
 *
 * 🎯 Purpose:
 * Wires the Community Points-derived Levels bounded context.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { LEVEL_CURRENT_READER } from './contracts/level-current-reader.contract';
import { PrismaLevelCurrentReader } from './infrastructure/repositories/prisma-level-current.reader';
import { LevelsProvidersModule } from './levels-providers.module';
import { LevelsResolver } from './presentation/graphql/resolvers/levels.resolver';

@Module({
  imports: [LevelsProvidersModule],
  providers: [
    LevelsResolver,
    { provide: LEVEL_CURRENT_READER, useClass: PrismaLevelCurrentReader },
  ],
  exports: [LEVEL_CURRENT_READER],
})
export class LevelsModule {}

/**
 * Levels dock downstream of Community Points. No duplicated fuel tanks.
 */
