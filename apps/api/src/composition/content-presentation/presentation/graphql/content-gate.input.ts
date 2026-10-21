/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Content Presentation Composition
 * 📄 File: apps/api/src/composition/content-presentation/presentation/graphql/content-gate.input.ts
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
import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ContentGateOperator,
  ContentGateRequirementKind,
} from './content-gate.enums';
@InputType()
class ContentGateRequirementInput {
  @Field(() => ContentGateRequirementKind)
  @IsEnum(ContentGateRequirementKind)
  kind!: ContentGateRequirementKind;
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  threshold?: number;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  groupKey?: string;
}
@InputType()
export class CreateContentGateInput {
  @Field(() => ContentGateOperator)
  @IsEnum(ContentGateOperator)
  operator!: ContentGateOperator;
  @Field(() => [ContentGateRequirementInput])
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ContentGateRequirementInput)
  requirements!: ContentGateRequirementInput[];
}
