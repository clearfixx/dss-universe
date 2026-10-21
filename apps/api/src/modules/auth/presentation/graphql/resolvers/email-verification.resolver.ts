import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';
import { Field, InputType } from '@nestjs/graphql';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import type { GraphqlContext } from '@api/core/graphql';
import { EmailVerificationService } from '../../../application/services/email-verification.service';
import { LogoutResultModel } from '../models/logout-result.model';

@InputType()
class VerifyEmailInput {
  @Field() @IsString() @Matches(/^[a-f0-9]{64}$/) token!: string;
}

@Resolver()
export class EmailVerificationResolver {
  constructor(private readonly verification: EmailVerificationService) {}

  @Mutation(() => LogoutResultModel)
  @UseGuards(JwtAuthGuard)
  requestEmailVerification(
    @AuthUser() user: AuthenticatedUser,
    @Context() context: GraphqlContext,
  ) {
    return this.verification.request(user.id, context.req.ip ?? 'unknown');
  }

  @Mutation(() => LogoutResultModel)
  verifyEmail(@Args('input') input: VerifyEmailInput) {
    return this.verification.verify(input.token);
  }
}
