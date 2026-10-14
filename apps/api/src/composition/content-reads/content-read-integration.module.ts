/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/content-read-integration.module.ts
 *
 * 🎯 Purpose:
 * Binds minimal owner evidence for News, Profile Wall, Content Access and Activity.
 *
 * 🧠 Responsibilities:
 * • exposes only the operation-specific data required by its consumer;
 * • preserves owner validation and propagates failures without defaults.
 *
 * 🏗️ Architecture:
 * Narrow dependency boundary; policy and persistence stay with their owners.
 *
 * ⚠️ Important:
 * No credentials, gate aggregate or ORM transaction crosses this boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { MediaModule } from '@api/modules/media';
import { ActivityModule, ACTIVITY_VIEWER_CONTEXT } from '@api/modules/activity';
import { NEWS_MEDIA_EVIDENCE, NEWS_ATTACHMENT_READER } from '@api/modules/news';
import { NewsAttachmentAdapter } from './infrastructure/news-attachment.adapter';
import {
  PROFILE_ACTIVITY_READER,
  WALL_IMAGE_ELIGIBILITY,
  UsersModule,
} from '@api/modules/users';
import { ActivityViewerContextAdapter } from './infrastructure/activity-viewer-context.adapter';
import { AuthModule } from '@api/modules/auth';
import { InteractionsModule } from '@api/modules/interactions';
import { ReputationModule } from '@api/modules/reputation';
import {
  GATE_ACCOUNT_EVIDENCE,
  GATE_COMMENT_COUNT,
  GATE_REPUTATION_TOTAL,
} from '@api/modules/content-access';
import { GateAccountEvidenceAdapter } from './infrastructure/gate-account-evidence.adapter';
import { GateCommentCountAdapter } from './infrastructure/gate-comment-count.adapter';
import { GateReputationTotalAdapter } from './infrastructure/gate-reputation-total.adapter';
import { WallImageEligibilityAdapter } from './infrastructure/wall-image-eligibility.adapter';
import { NewsMediaEvidenceAdapter } from './infrastructure/news-media-evidence.adapter';
import { ProfileActivityAdapter } from './infrastructure/profile-activity.adapter';

@Global()
@Module({
  imports: [
    MediaModule,
    ActivityModule,
    UsersModule,
    AuthModule,
    InteractionsModule,
    ReputationModule,
  ],
  providers: [
    { provide: NEWS_ATTACHMENT_READER, useClass: NewsAttachmentAdapter },
    {
      provide: ACTIVITY_VIEWER_CONTEXT,
      useClass: ActivityViewerContextAdapter,
    },
    { provide: GATE_ACCOUNT_EVIDENCE, useClass: GateAccountEvidenceAdapter },
    { provide: GATE_COMMENT_COUNT, useClass: GateCommentCountAdapter },
    { provide: GATE_REPUTATION_TOTAL, useClass: GateReputationTotalAdapter },
    { provide: WALL_IMAGE_ELIGIBILITY, useClass: WallImageEligibilityAdapter },
    { provide: NEWS_MEDIA_EVIDENCE, useClass: NewsMediaEvidenceAdapter },
    { provide: PROFILE_ACTIVITY_READER, useClass: ProfileActivityAdapter },
  ],
  exports: [
    NEWS_ATTACHMENT_READER,
    ACTIVITY_VIEWER_CONTEXT,
    NEWS_MEDIA_EVIDENCE,
    PROFILE_ACTIVITY_READER,
    GATE_ACCOUNT_EVIDENCE,
    GATE_COMMENT_COUNT,
    GATE_REPUTATION_TOTAL,
    WALL_IMAGE_ELIGIBILITY,
  ],
})
export class ContentReadIntegrationModule {}
