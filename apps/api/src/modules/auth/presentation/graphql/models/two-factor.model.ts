/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/models/two-factor.model.ts
 * 🎯 Purpose: Defines the existing two-factor transport result projections.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TwoFactorStatusModel {
  @Field() enabled!: boolean;
  @Field(() => Int) recoveryCodesRemaining!: number;
}

@ObjectType()
export class TwoFactorSetupModel {
  @Field() secret!: string;
  @Field() otpauthUri!: string;
}

@ObjectType()
export class TwoFactorConfirmationModel {
  @Field(() => [String]) recoveryCodes!: string[];
}
