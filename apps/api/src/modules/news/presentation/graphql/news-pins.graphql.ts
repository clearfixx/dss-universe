import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { NewsPinsService } from '../../application/services/news-pins.service';
import { SetNewsPinInput } from './inputs/set-news-pin.input';
import { ManagedNewsPinModel } from './models/managed-news-pin.model';
import { RemoveNewsPinResultModel } from './models/remove-news-pin-result.model';

@Resolver()
@UseGuards(JwtAuthGuard)
export class NewsPinsResolver {
  constructor(private readonly pins: NewsPinsService) {}

  @Mutation(() => ManagedNewsPinModel)
  setNewsPin(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: SetNewsPinInput,
  ) {
    return this.pins.set({ ...input, actorId: actor.id });
  }

  @Mutation(() => RemoveNewsPinResultModel)
  async removeNewsPin(
    @AuthUser() actor: AuthenticatedUser,
    @Args('articleId', { type: () => ID }) articleId: string,
  ): Promise<{ success: boolean }> {
    return { success: await this.pins.remove(articleId, actor.id) };
  }
}
