import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import type { GraphqlContext } from '@api/core/graphql';
import { PasswordRecoveryService } from '../../../application/services/password-recovery.service';
import { LogoutResultModel } from '../models/logout-result.model';
import { RequestPasswordRecoveryInput } from '../inputs/request-password-recovery.input';
import { ResetPasswordInput } from '../inputs/reset-password.input';

@Resolver()
export class PasswordRecoveryResolver {
  constructor(private readonly recovery: PasswordRecoveryService) {}

  @Mutation(() => LogoutResultModel)
  requestPasswordRecovery(
    @Args('input') input: RequestPasswordRecoveryInput,
    @Context() context: GraphqlContext,
  ) {
    return this.recovery.request(input.email, context.req.ip ?? 'unknown');
  }

  @Mutation(() => LogoutResultModel)
  resetPassword(
    @Args('input') input: ResetPasswordInput,
    @Context() context: GraphqlContext,
  ) {
    return this.recovery.reset(
      input.token,
      input.password,
      context.req.ip ?? 'unknown',
    );
  }
}
