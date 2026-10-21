import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
  Mutation,
  ObjectType,
  Resolver,
} from '@nestjs/graphql';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { NewsPinsService } from '../../application/services/news-pins.service';
import { NewsPinScopeModel } from './news-delivery.graphql';

@ObjectType('ManagedNewsPin')
class ManagedNewsPinModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) articleId!: string;
  @Field(() => NewsPinScopeModel) scope!: NewsPinScopeModel;
  @Field(() => ID, { nullable: true }) categoryId!: string | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) expiresAt!: Date | null;
  @Field(() => ID) pinnedById!: string;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
}

@InputType()
class SetNewsPinInput {
  @Field(() => ID) @IsUUID() articleId!: string;
  @Field(() => NewsPinScopeModel)
  @IsEnum(NewsPinScopeModel)
  scope!: NewsPinScopeModel;
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  expiresAt?: Date;
}

@ObjectType('RemoveNewsPinResult')
class RemoveNewsPinResultModel {
  @Field() success!: boolean;
}

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
