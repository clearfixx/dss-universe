/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/models/interaction-target.model.ts
 *
 * 🎯 Purpose:
 * Defines GraphQL projections for targets and access decisions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum InteractionCapabilityInput {
  READ = 'READ',
  COMMENT = 'COMMENT',
  REACT = 'REACT',
  BOOKMARK = 'BOOKMARK',
}

registerEnumType(InteractionCapabilityInput, {
  name: 'InteractionCapability',
});

@ObjectType('InteractionTarget')
export class InteractionTargetModel {
  @Field(() => ID)
  id!: string;

  @Field()
  kind!: string;

  @Field()
  ownerModule!: string;

  @Field()
  ownerType!: string;

  @Field(() => ID)
  ownerId!: string;

  @Field()
  status!: string;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}

@ObjectType('InteractionAccessDecision')
export class InteractionAccessDecisionModel {
  @Field(() => InteractionTargetModel)
  target!: InteractionTargetModel;

  @Field(() => InteractionCapabilityInput)
  capability!: InteractionCapabilityInput;

  @Field()
  allowed!: boolean;

  @Field(() => String, { nullable: true })
  reason!: string | null;
}

/**
 * GraphQL exposes the coordinate and decision, never a shortcut around policy.
 */
