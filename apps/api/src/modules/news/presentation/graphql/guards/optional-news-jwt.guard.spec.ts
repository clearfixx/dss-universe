/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: D5 Responsibility Verification
 * 📄 File: apps/api/src/modules/news/presentation/graphql/guards/optional-news-jwt.guard.spec.ts
 * 🎯 Purpose: Pins the existing behavior after private class extraction.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { OptionalNewsJwtGuard } from './optional-news-jwt.guard';

describe('OptionalNewsJwtGuard', () => {
  const guard = new OptionalNewsJwtGuard();
  afterEach(() => jest.restoreAllMocks());
  it('extracts the exact GraphQL request', () => {
    const req = { user: { id: 'opaque-subject' } };
    const context = {} as ExecutionContext;
    const create = jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req }),
    } as unknown as GqlExecutionContext);
    expect(guard.getRequest(context)).toBe(req);
    expect(create).toHaveBeenCalledWith(context);
  });
  it('preserves a successful authenticated identity without projection changes', () => {
    const user = { id: 'opaque-subject' };
    expect(guard.handleRequest(undefined, user)).toBe(user);
  });
  it('keeps absent credentials anonymous', () => {
    expect(guard.handleRequest(undefined, undefined)).toBeUndefined();
    expect(guard.handleRequest(undefined, false)).toBe(false);
  });
  it('discards identity on authentication failure', () => {
    expect(
      guard.handleRequest(new Error('synthetic invalid JWT'), {
        id: 'must-not-leak',
      }),
    ).toBeUndefined();
  });
});
