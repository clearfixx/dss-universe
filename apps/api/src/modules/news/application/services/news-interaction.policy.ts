import {
  Inject,
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';

import {
  InteractionPolicyRegistryService,
  type InteractionCapability,
  type InteractionTarget,
  type InteractionTargetPolicy,
} from '../../../interactions';
import {
  NEWS_REPOSITORY,
  type NewsRepository,
} from '../../domain/repositories/news.repository.interface';

export const NEWS_INTERACTION_KIND = 'news.article';

@Injectable()
export class NewsInteractionPolicy
  implements InteractionTargetPolicy, OnModuleInit, OnModuleDestroy
{
  readonly kind = NEWS_INTERACTION_KIND;

  constructor(
    private readonly policies: InteractionPolicyRegistryService,
    @Inject(NEWS_REPOSITORY) private readonly news: NewsRepository,
  ) {}

  onModuleInit(): void {
    this.policies.register(this);
  }

  onModuleDestroy(): void {
    this.policies.unregister(this);
  }

  async authorize(
    target: InteractionTarget,
    actorId: string,
    capability: InteractionCapability,
  ): Promise<{ allowed: boolean; reason?: string }> {
    void actorId;
    const article = await this.news.findById(target.ownerId);
    if (!article || article.interactionTargetId !== target.id) {
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
