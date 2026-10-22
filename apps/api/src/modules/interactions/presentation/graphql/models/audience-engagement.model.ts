/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/models/audience-engagement.model.ts
 * 🎯 Purpose: Defines structural GraphQL engagement count projections.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ShareChannelModel } from './share-channel.model';

@ObjectType('ShareChannelCount')
export class ShareChannelCountModel {
  @Field(() => ShareChannelModel) channel!: ShareChannelModel;
  @Field(() => Int) count!: number;
}

@ObjectType('AudienceEngagement')
export class AudienceEngagementModel {
  @Field() changed!: boolean;
  @Field(() => Int) viewCount!: number;
  @Field(() => Int) shareCount!: number;
  @Field(() => [ShareChannelCountModel]) shares!: ShareChannelCountModel[];
}
