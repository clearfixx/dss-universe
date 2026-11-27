import { HttpException } from '@nestjs/common';
import { AccountBannedException } from '../../domain/exceptions/account-banned.exception';
import { mapAuthFailure } from './map-auth-failure';
import { formatGraphqlError } from '@api/core/graphql/errors/graphql-error.formatter';

describe('banned login failure', () => {
  it('carries only the ban ticket to the client', () => {
    const mapped = mapAuthFailure(
      new AccountBannedException('ticket'),
    ) as HttpException;
    expect(mapped.getStatus()).toBe(403);
    expect(mapped.getResponse()).toEqual({
      message: 'ACCOUNT_BANNED',
      statusCode: 403,
      banTicket: 'ticket',
    });
    expect(
      formatGraphqlError({
        message: 'x',
        extensions: {
          originalError: {
            ...(mapped.getResponse() as object),
            secret: 'never',
          },
        },
      }).extensions,
    ).toEqual({ code: 'FORBIDDEN', statusCode: 403, banTicket: 'ticket' });
  });

  it('drops a non-string ticket', () => {
    expect(
      formatGraphqlError({
        message: 'x',
        extensions: {
          originalError: { statusCode: 403, banTicket: { nested: true } },
        },
      }).extensions,
    ).not.toHaveProperty('banTicket');
  });
});
