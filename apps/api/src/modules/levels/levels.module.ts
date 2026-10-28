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

import { LevelsProvidersModule } from './levels-providers.module';
import { LevelsResolver } from './presentation/graphql/resolvers/levels.resolver';

@Module({
  imports: [LevelsProvidersModule],
  providers: [LevelsResolver],
  exports: [],
})
export class LevelsModule {}

/**
 * Levels dock downstream of Community Points. No duplicated fuel tanks.
 */
