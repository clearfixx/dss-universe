import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { IsString, Matches, MinLength } from 'class-validator';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { TwoFactorService } from '../../../application/services/two-factor.service';
import { LogoutResultModel } from '../models/logout-result.model';

@ObjectType()
class TwoFactorStatusModel {
  @Field() enabled!: boolean;
  @Field(() => Int) recoveryCodesRemaining!: number;
}

@ObjectType()
class TwoFactorSetupModel {
  @Field() secret!: string;
  @Field() otpauthUri!: string;
}

@ObjectType()
class TwoFactorConfirmationModel {
  @Field(() => [String]) recoveryCodes!: string[];
}

@InputType()
class ConfirmTwoFactorInput {
  @Field() @IsString() @Matches(/^\d{6}$/) code!: string;
}

@InputType()
class DisableTwoFactorInput {
  @Field() @IsString() @MinLength(8) password!: string;
  @Field()
  @IsString()
  @Matches(/^(?:\d{6}|[a-f0-9]{6}-[a-f0-9]{6})$/i)
  code!: string;
}

@Resolver()
export class TwoFactorResolver {
  constructor(private readonly twoFactor: TwoFactorService) {}

  @Query(() => TwoFactorStatusModel)
  @UseGuards(JwtAuthGuard)
  viewerTwoFactorStatus(@AuthUser() user: AuthenticatedUser) {
    return this.twoFactor.status(user.id);
  }

  @Mutation(() => TwoFactorSetupModel)
  @UseGuards(JwtAuthGuard)
  beginViewerTwoFactorSetup(@AuthUser() user: AuthenticatedUser) {
    return this.twoFactor.begin(user.id, user.email);
  }

  @Mutation(() => TwoFactorConfirmationModel)
  @UseGuards(JwtAuthGuard)
  confirmViewerTwoFactorSetup(
    @AuthUser() user: AuthenticatedUser,
    @Args('input') input: ConfirmTwoFactorInput,
  ) {
    return this.twoFactor.confirm(user.id, input.code);
  }

  @Mutation(() => LogoutResultModel)
  @UseGuards(JwtAuthGuard)
  disableViewerTwoFactor(
    @AuthUser() user: AuthenticatedUser,
    @Args('input') input: DisableTwoFactorInput,
  ) {
    return this.twoFactor.disable(user.id, input.password, input.code);
  }
}
