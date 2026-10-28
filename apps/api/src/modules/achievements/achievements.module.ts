/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/achievements.module.ts
 *
 * 🎯 Purpose:
 * Wires the event-driven Achievements bounded context.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { AchievementsProvidersModule } from './achievements-providers.module';
import { AchievementsResolver } from './presentation/graphql/resolvers/achievements.resolver';

@Module({
  imports: [AchievementsProvidersModule],
  providers: [AchievementsResolver],
  exports: [],
})
export class AchievementsModule {}

/**
 * This module recognizes milestones. It does not manufacture authority.
 */
