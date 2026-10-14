/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/application/services/news-interaction.policy.ts
 *
 * 🎯 Purpose:
 * Evaluates owner-side News capabilities without knowing the interaction registry.
 *
 * 🧠 Responsibilities:
 * • retains publication and interaction-flag decisions in News;
 * • verifies minimal article/target coordinates before allowing a capability.
 *
 * 🏗️ Architecture:
 * Private News policy implementing its own published decision contract.
 *
 * ⚠️ Important:
 * Missing owner records or unpublished articles must not grant interaction access.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';

import type {
  NewsInteractionDecisions,
  NewsInteractionRequest,
  NewsInteractionDecision,
} from '../../contracts/news-interaction-decisions.contract';
import {
  NEWS_REPOSITORY,
  type NewsRepository,
} from '../../domain/repositories/news.repository.interface';

@Injectable()
export class NewsInteractionPolicy implements NewsInteractionDecisions {
  constructor(@Inject(NEWS_REPOSITORY) private readonly news: NewsRepository) {}

  async authorize({
    articleId,
    interactionTargetId,
    capability,
  }: NewsInteractionRequest): Promise<NewsInteractionDecision> {
    const article = await this.news.findById(articleId);
    if (!article || article.interactionTargetId !== interactionTargetId) {
      return { allowed: false, reason: 'OWNER_RECORD_UNAVAILABLE' };
    }
    if (article.status !== 'PUBLISHED') {
      return { allowed: false, reason: 'NEWS_NOT_PUBLISHED' };
    }
    if (capability === 'COMMENT' && !article.allowComments) {
      return { allowed: false, reason: 'NEWS_COMMENTS_DISABLED' };
    }
    if (capability === 'REACT' && !article.allowRating) {
      return { allowed: false, reason: 'NEWS_RATING_DISABLED' };
    }
    if (capability === 'SHARE' && !article.allowSharing) {
      return { allowed: false, reason: 'NEWS_SHARING_DISABLED' };
    }
    return { allowed: true };
  }
}
