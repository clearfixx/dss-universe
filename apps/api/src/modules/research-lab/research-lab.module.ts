/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Research Lab
 * 📄 File: apps/api/src/modules/research-lab/research-lab.module.ts
 *
 * 🎯 Purpose:
 * Establishes the owner boundary before application use cases are introduced.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ResearchLabCommandResolver } from './research-lab-command.resolver';
import { ResearchLabReadResolver } from './research-lab-read.resolver';
import { ResearchLabDelivery } from './infrastructure/research-lab-delivery';
import { RESEARCH_INTERACTION_DECISIONS } from './contracts/research-interaction-decisions';
import { RESEARCH_SEARCH_SOURCE } from './contracts/research-search-source';
import { ResearchLabSearch } from './infrastructure/research-lab-search';
import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@api/core/authorization';
import { EditorModule } from '@api/modules/editor';
import { ResearchLabService } from './infrastructure/prisma-research-lab-workflow';
import { RESEARCH_LAB_AUTHORITY_DECISIONS } from './contracts/research-lab-authority.contract';
import { ResearchLabAuthorityAdapter } from './infrastructure/research-lab-authority.adapter';

@Module({
  imports: [AuthorizationModule, EditorModule],
  providers: [
    { provide: RESEARCH_SEARCH_SOURCE, useClass: ResearchLabSearch },
    {
      provide: RESEARCH_INTERACTION_DECISIONS,
      useExisting: ResearchLabDelivery,
    },
    ResearchLabCommandResolver,
    ResearchLabReadResolver,
    ResearchLabDelivery,
    ResearchLabService,
    ResearchLabAuthorityAdapter,
    {
      provide: RESEARCH_LAB_AUTHORITY_DECISIONS,
      useExisting: ResearchLabAuthorityAdapter,
    },
  ],
  exports: [
    RESEARCH_SEARCH_SOURCE,
    ResearchLabService,
    RESEARCH_INTERACTION_DECISIONS,
  ],
})
export class ResearchLabModule {}
