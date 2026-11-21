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
import {
  ActivityModule,
  ACTIVITY_SUBJECT_VISIBILITY,
  ACTIVITY_VIEWER_CONTEXT,
} from '@api/modules/activity';
import { ActivitySubjectVisibilityAdapter } from './infrastructure/activity-subject-visibility.adapter';
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
import { ModerationModule } from '@api/modules/moderation';
import {
  GATE_ACCOUNT_EVIDENCE,
  GATE_COMMENT_COUNT,
  GATE_REPUTATION_TOTAL,
  GATE_VIEWER_RESTRICTION,
  GATE_FORUM_POST_COUNT,
} from '@api/modules/content-access';
import { GateAccountEvidenceAdapter } from './infrastructure/gate-account-evidence.adapter';
import { GateCommentCountAdapter } from './infrastructure/gate-comment-count.adapter';
import { GateReputationTotalAdapter } from './infrastructure/gate-reputation-total.adapter';
import { GateViewerRestrictionAdapter } from './infrastructure/gate-viewer-restriction.adapter';
import {
  FORUM_ACCOUNT_EVIDENCE,
  FORUM_NEWS_FACTS,
  ForumFactsModule,
} from '@api/modules/forum';
import { NewsDiscussionFactsModule } from '@api/modules/news';
import { ForumNewsFactsAdapter } from './infrastructure/forum-news-facts.adapter';
import { GateForumPostCountAdapter } from './infrastructure/gate-forum-post-count.adapter';
import { ForumAccountEvidenceAdapter } from './infrastructure/forum-account-evidence.adapter';
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
    ModerationModule,
    NewsDiscussionFactsModule,
    ForumFactsModule,
  ],
  providers: [
    { provide: NEWS_ATTACHMENT_READER, useClass: NewsAttachmentAdapter },
    {
      provide: ACTIVITY_SUBJECT_VISIBILITY,
      useClass: ActivitySubjectVisibilityAdapter,
    },
    {
      provide: ACTIVITY_VIEWER_CONTEXT,
      useClass: ActivityViewerContextAdapter,
    },
    { provide: GATE_ACCOUNT_EVIDENCE, useClass: GateAccountEvidenceAdapter },
    { provide: GATE_COMMENT_COUNT, useClass: GateCommentCountAdapter },
    { provide: GATE_REPUTATION_TOTAL, useClass: GateReputationTotalAdapter },
    {
      provide: GATE_VIEWER_RESTRICTION,
      useClass: GateViewerRestrictionAdapter,
    },
    { provide: WALL_IMAGE_ELIGIBILITY, useClass: WallImageEligibilityAdapter },
    { provide: FORUM_ACCOUNT_EVIDENCE, useClass: ForumAccountEvidenceAdapter },
    { provide: FORUM_NEWS_FACTS, useClass: ForumNewsFactsAdapter },
    { provide: GATE_FORUM_POST_COUNT, useClass: GateForumPostCountAdapter },
    { provide: NEWS_MEDIA_EVIDENCE, useClass: NewsMediaEvidenceAdapter },
    { provide: PROFILE_ACTIVITY_READER, useClass: ProfileActivityAdapter },
  ],
  exports: [
    NEWS_ATTACHMENT_READER,
    ACTIVITY_VIEWER_CONTEXT,
    ACTIVITY_SUBJECT_VISIBILITY,
    NEWS_MEDIA_EVIDENCE,
    PROFILE_ACTIVITY_READER,
    GATE_ACCOUNT_EVIDENCE,
    GATE_COMMENT_COUNT,
    GATE_REPUTATION_TOTAL,
    GATE_VIEWER_RESTRICTION,
    WALL_IMAGE_ELIGIBILITY,
    FORUM_ACCOUNT_EVIDENCE,
    FORUM_NEWS_FACTS,
    GATE_FORUM_POST_COUNT,
  ],
})
export class ContentReadIntegrationModule {}
