import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

export const AuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    if (context.getType<string>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext<{
        req: { user: AuthenticatedUser };
      }>().req.user;
    }

    const request = context.switchToHttp().getRequest<{
      user: AuthenticatedUser;
    }>();

    return request.user;
  },
);
