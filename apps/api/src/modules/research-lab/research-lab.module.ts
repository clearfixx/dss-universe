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
import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@api/core/authorization';
import { EditorModule } from '@api/modules/editor';
import { ResearchLabService } from './infrastructure/prisma-research-lab-workflow';
import { RESEARCH_LAB_AUTHORITY_DECISIONS } from './contracts/research-lab-authority.contract';
import { ResearchLabAuthorityAdapter } from './infrastructure/research-lab-authority.adapter';

@Module({
  imports: [AuthorizationModule, EditorModule],
  providers: [
    ResearchLabService,
    ResearchLabAuthorityAdapter,
    {
      provide: RESEARCH_LAB_AUTHORITY_DECISIONS,
      useExisting: ResearchLabAuthorityAdapter,
    },
  ],
  exports: [ResearchLabService],
})
export class ResearchLabModule {}
