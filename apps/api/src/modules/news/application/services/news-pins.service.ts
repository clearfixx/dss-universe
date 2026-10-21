import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Permission, PermissionsService } from '@api/core/authorization';
import {
  NEWS_PINS_REPOSITORY,
  type NewsPinsRepository,
} from '../../domain/repositories/news-pins.repository.interface';
import type { NewsPin, NewsPinScope } from '../../domain/types/news-pin.type';

@Injectable()
export class NewsPinsService {
  constructor(
    @Inject(NEWS_PINS_REPOSITORY) private readonly pins: NewsPinsRepository,
    private readonly permissions: PermissionsService,
  ) {}

  async set(input: {
    articleId: string;
    actorId: string;
    scope: NewsPinScope;
    categoryId?: string;
    expiresAt?: Date;
  }): Promise<NewsPin> {
    await this.assertAllowed(input.actorId);
    const categoryId = input.categoryId?.trim() || null;
    if (input.scope === 'GLOBAL' && categoryId) {
      throw new BadRequestException(
        'A global News pin cannot have a category.',
      );
    }
    if (input.scope === 'CATEGORY' && !categoryId) {
      throw new BadRequestException('A category News pin requires a category.');
    }
    if (input.expiresAt && input.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'News pin expiration must be in the future.',
      );
    }
    return this.pins.set({
      articleId: input.articleId,
      actorId: input.actorId,
      scope: input.scope,
      categoryId,
      expiresAt: input.expiresAt ?? null,
    });
  }

  async remove(articleId: string, actorId: string): Promise<boolean> {
    await this.assertAllowed(actorId);
    const removed = await this.pins.remove(articleId, actorId);
    if (!removed) throw new NotFoundException('News pin was not found.');
    return true;
  }

  private async assertAllowed(actorId: string): Promise<void> {
    const profile = await this.permissions.getAccessProfileByUserId(actorId);
    if (!profile.permissions.includes(Permission.NewsPinsManage)) {
      throw new ForbiddenException('News pin management was denied.');
    }
  }
}
