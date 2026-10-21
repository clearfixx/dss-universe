/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Content Presentation Composition
 * 📄 File: apps/api/src/composition/content-presentation/presentation/graphql/content-gate.model.ts
 *
 * 🎯 Purpose:
 * Defines existing content transport fields without policy or persistence.
 *
 * 🏗️ Architecture:
 * Root transport composition; policy and persistence remain with owners.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';
import {
  ContentGateOperator,
  ContentGateRequirementKind,
} from './content-gate.enums';
@ObjectType()
class ContentGateRequirementModel {
  @Field(() => ID) id!: string;
  @Field(() => ContentGateRequirementKind) kind!: ContentGateRequirementKind;
  @Field(() => Int, { nullable: true }) threshold!: number | null;
  @Field(() => String, { nullable: true }) groupKey!: string | null;
}
@ObjectType()
export class ContentGateModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) ownerId!: string;
  @Field(() => ContentGateOperator) operator!: ContentGateOperator;
  @Field(() => [ContentGateRequirementModel])
  requirements!: ContentGateRequirementModel[];
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
}
@ObjectType()
export class ContentGateEvaluationModel {
  @Field(() => ContentGateModel) gate!: ContentGateModel;
  @Field() allowed!: boolean;
  @Field() bypassed!: boolean;
  @Field(() => [ContentGateRequirementKind])
  unmet!: ContentGateRequirementKind[];
  @Field() notice!: string;
}
