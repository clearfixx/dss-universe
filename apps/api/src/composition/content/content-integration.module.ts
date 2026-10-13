/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Composition
 * 📄 File: apps/api/src/composition/content/content-integration.module.ts
 *
 * 🎯 Purpose:
 * Binds operation-specific normalization and gate-decision ports outside feature modules.
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
import { ContentAccessModule } from '@api/modules/content-access';
import { EditorModule, EDITOR_GATE_DECISIONS } from '@api/modules/editor';
import { COMMENT_DOCUMENT_NORMALIZER } from '@api/modules/interactions';
import { NEWS_DOCUMENT_NORMALIZER } from '@api/modules/news';
import { EditorGateDecisionAdapter } from './infrastructure/editor-gate-decision.adapter';
import { CommentDocumentAdapter } from './infrastructure/comment-document.adapter';
import { NewsDocumentAdapter } from './infrastructure/news-document.adapter';

@Global()
@Module({
  imports: [ContentAccessModule, EditorModule],
  providers: [
    { provide: EDITOR_GATE_DECISIONS, useClass: EditorGateDecisionAdapter },
    { provide: COMMENT_DOCUMENT_NORMALIZER, useClass: CommentDocumentAdapter },
    { provide: NEWS_DOCUMENT_NORMALIZER, useClass: NewsDocumentAdapter },
  ],
  exports: [
    EDITOR_GATE_DECISIONS,
    COMMENT_DOCUMENT_NORMALIZER,
    NEWS_DOCUMENT_NORMALIZER,
  ],
})
export class ContentIntegrationModule {}
