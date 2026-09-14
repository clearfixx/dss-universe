import {
  Field,
  Float,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

export enum ActivityFeedReasonModel {
  OWN_ACTIVITY = 'OWN_ACTIVITY',
  MENTION = 'MENTION',
  FOLLOWING = 'FOLLOWING',
  INTEREST = 'INTEREST',
  RECENT = 'RECENT',
}

registerEnumType(ActivityFeedReasonModel, { name: 'ActivityFeedReason' });

@ObjectType('ActivityFeedItem')
export class ActivityFeedItemModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  actorId!: string;

  @Field()
  module!: string;

  @Field()
  action!: string;

  @Field()
  subjectType!: string;

  @Field(() => ID)
  subjectId!: string;

  @Field()
  occurredAt!: string;

  @Field()
  isUnread!: boolean;

  @Field(() => ActivityFeedReasonModel)
  reason!: ActivityFeedReasonModel;

  @Field(() => Float)
  score!: number;
}

@ObjectType('ActivityFeedPage')
export class ActivityFeedPageModel {
  @Field(() => [ActivityFeedItemModel])
  items!: ActivityFeedItemModel[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field(() => Int)
  unreadCount!: number;

  @Field(() => String, { nullable: true })
  lastVisitedAt!: string | null;

  @Field()
  generatedAt!: string;

  @Field()
  recommendationMode!: string;
}

@ObjectType('ActivityFeedVisit')
export class ActivityFeedVisitModel {
  @Field()
  visitedAt!: string;
}
