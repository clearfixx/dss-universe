/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/moderation.module.ts
 *
 * 🎯 Purpose:
 * Assembles the M-0 sanctions core and binds centralized read-only enforcement.
 *
 * ⚠️ Important:
 * The interceptor is global; it only consults this module through the core
 * WRITE_RESTRICTION_READER contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  ReadOnlyEnforcementInterceptor,
  WRITE_RESTRICTION_READER,
  type WriteRestrictionReader,
} from '@api/core/auth';
import { AuthorizationModule } from '@api/core/authorization';
import { SANCTION_ISSUER } from './contracts/sanction-issuer.contract';
import {
  SANCTION_STATE_READER,
  type SanctionStateReader,
} from './contracts/sanction-state-reader.contract';
import { CommunityRulesService } from './infrastructure/prisma-community-rules';
import { ModerationSanctionsService } from './infrastructure/prisma-moderation-sanctions';
import { CommunityRulesResolver } from './presentation/community-rules.resolver';
import { ModerationSanctionsResolver } from './presentation/moderation-sanctions.resolver';

@Module({
  imports: [AuthorizationModule],
  providers: [
    ModerationSanctionsService,
    ModerationSanctionsResolver,
    CommunityRulesService,
    CommunityRulesResolver,
    { provide: SANCTION_STATE_READER, useExisting: ModerationSanctionsService },
    { provide: SANCTION_ISSUER, useExisting: ModerationSanctionsService },
    {
      provide: WRITE_RESTRICTION_READER,
      inject: [SANCTION_STATE_READER],
      useFactory: (state: SanctionStateReader): WriteRestrictionReader => ({
        restrictedUntil: (subjectId, at) => state.readOnlyUntil(subjectId, at),
      }),
    },
    { provide: APP_INTERCEPTOR, useClass: ReadOnlyEnforcementInterceptor },
  ],
  exports: [SANCTION_STATE_READER, SANCTION_ISSUER],
})
export class ModerationModule {}
