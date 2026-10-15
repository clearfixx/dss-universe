/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Comment Write Composition
 * 📄 File: apps/api/src/composition/comment-writes/comment-write-composition.module.ts
 *
 * 🎯 Purpose:
 * Binds the semantic comment-write port to guarded owner adapters and one root transaction.
 *
 * 🧠 Responsibilities:
 * • keeps SQL selectors, matcher and stateless writer private to infrastructure assembly;
 * • exports only the Interactions-owned semantic write capability.
 *
 * 🏗️ Architecture:
 * Explicit root Nest assembly; no feature-to-feature implementation imports.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { AuditModule } from '@api/core/audit';
import { EventsModule } from '@api/core/events';
import { COMMENT_WRITE_TRANSACTION } from '@api/modules/interactions';
import {
  PrismaCommentWriter,
  PrismaInteractionTargetWriter,
} from '@api/modules/interactions/infrastructure';
import { PrismaActiveSubjectSelector } from '@api/modules/auth/infrastructure';
import {
  PrismaMentionProfileSelector,
  MentionRecipientMatcher,
} from '@api/modules/users/infrastructure';
import { PrismaMentionRecipientResolver } from './infrastructure/prisma-mention-recipient.resolver';
import { PrismaCommentWriteTransaction } from './infrastructure/prisma-comment-write.transaction';

@Global()
@Module({
  imports: [PrismaModule, AuditModule, EventsModule],
  providers: [
    PrismaCommentWriter,
    PrismaInteractionTargetWriter,
    PrismaActiveSubjectSelector,
    PrismaMentionProfileSelector,
    MentionRecipientMatcher,
    PrismaMentionRecipientResolver,
    {
      provide: COMMENT_WRITE_TRANSACTION,
      useClass: PrismaCommentWriteTransaction,
    },
  ],
  exports: [COMMENT_WRITE_TRANSACTION],
})
export class CommentWriteCompositionModule {}
