import {
  Args,
  Context,
  Field,
  InputType,
  Mutation,
  Resolver,
} from '@nestjs/graphql';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { GraphqlContext } from '@api/core/graphql';
import { PasswordRecoveryService } from '../../../application/services/password-recovery.service';
import { LogoutResultModel } from '../models/logout-result.model';

@InputType()
export class RequestPasswordRecoveryInput {
  @Field() @IsEmail() @MaxLength(254) email!: string;
}

@InputType()
export class ResetPasswordInput {
  @Field() @IsString() @Matches(/^[a-f0-9]{64}$/) token!: string;
  @Field() @IsString() @MinLength(8) @MaxLength(72) password!: string;
}

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
