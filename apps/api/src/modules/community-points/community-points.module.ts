/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/community-points.module.ts
 *
 * 🎯 Purpose:
 * Wires the event-derived Community Points bounded context.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import {
  CommunityPointsProvidersModule,
  COMMUNITY_POINTS_INTERNAL_BALANCE_READER,
} from './community-points-providers.module';
import { COMMUNITY_POINTS_BALANCE_READER } from './contracts/balance-reader.contract';
import { CommunityPointsResolver } from './presentation/graphql/resolvers/community-points.resolver';

@Module({
  imports: [CommunityPointsProvidersModule],
  providers: [
    {
      provide: COMMUNITY_POINTS_BALANCE_READER,
      useExisting: COMMUNITY_POINTS_INTERNAL_BALANCE_READER,
    },
    CommunityPointsResolver,
  ],
  exports: [COMMUNITY_POINTS_BALANCE_READER],
})
export class CommunityPointsModule {}

/**
 * Community Points observes the Universe; feature modules keep their autonomy.
 */
