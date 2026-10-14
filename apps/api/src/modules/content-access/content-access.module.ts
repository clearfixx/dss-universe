/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/content-access.module.ts
 *
 * 🎯 Purpose:
 * Composes reusable Content Gate persistence, evaluation and GraphQL access.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { PrismaModule } from '@api/core/database';

import { ContentGatesService } from './application/services/content-gates.service';
import { ContentGateViewerFactsService } from './application/services/content-gate-viewer-facts.service';
import { ContentGateDecisionsService } from './application/services/content-gate-decisions.service';
import { CONTENT_GATE_DECISIONS } from './contracts/content-gate-decisions.contract';
import { CONTENT_GATE_DECISION_SCOPES } from './contracts/content-gate-decision-scopes.contract';
import { CONTENT_GATES_REPOSITORY } from './domain/repositories/content-gates.repository.interface';
import { PrismaContentGatesRepository } from './infrastructure/repositories/prisma-content-gates.repository';
import { ContentGatesResolver } from './presentation/graphql/content-gates.graphql';

@Module({
  imports: [PrismaModule],
  providers: [
    ContentGatesService,
    ContentGateViewerFactsService,
    ContentGateDecisionsService,
    {
      provide: CONTENT_GATE_DECISION_SCOPES,
      useExisting: ContentGateDecisionsService,
    },
    {
      provide: CONTENT_GATE_DECISIONS,
      useExisting: ContentGateDecisionsService,
    },
    ContentGatesResolver,
    {
      provide: CONTENT_GATES_REPOSITORY,
      useClass: PrismaContentGatesRepository,
    },
  ],
  exports: [CONTENT_GATE_DECISIONS, CONTENT_GATE_DECISION_SCOPES],
})
export class ContentAccessModule {}

/** Content modules bring the cargo; Content Access checks the manifest. */
