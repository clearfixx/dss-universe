import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import {
  AuthUser,
  JwtAuthGuard,
  PermittedWhileReadOnly,
  type AuthenticatedUser,
} from '@api/core/auth';
import type { GraphqlContext } from '@api/core/graphql';
import { EmailVerificationService } from '../../../application/services/email-verification.service';
import { LogoutResultModel } from '../models/logout-result.model';
import { VerifyEmailInput } from '../inputs/verify-email.input';

@Resolver()
export class EmailVerificationResolver {
  constructor(private readonly verification: EmailVerificationService) {}

  @PermittedWhileReadOnly()
  @Mutation(() => LogoutResultModel)
  @UseGuards(JwtAuthGuard)
  requestEmailVerification(
    @AuthUser() user: AuthenticatedUser,
    @Context() context: GraphqlContext,
  ) {
    return this.verification.request(user.id, context.req.ip ?? 'unknown');
  }

  @PermittedWhileReadOnly()
  @Mutation(() => LogoutResultModel)
  verifyEmail(@Args('input') input: VerifyEmailInput) {
    return this.verification.verify(input.token);
  }
}
