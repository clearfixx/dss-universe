/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core / Authentication
 * 📄 File: apps/api/src/core/auth/interceptors/read-only-enforcement.interceptor.spec.ts
 *
 * 🎯 Purpose:
 * Verifies centralized write blocking for read-only subjects.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { lastValueFrom, of } from 'rxjs';

import { ReadOnlyEnforcementInterceptor } from './read-only-enforcement.interceptor';

describe('ReadOnlyEnforcementInterceptor', () => {
  const until = new Date('2026-12-01T00:00:00Z');
  const restrictedUntil = jest.fn<Promise<Date | null>, [string, Date]>();
  const reflector = { getAllAndOverride: jest.fn() };
  const interceptor = new ReadOnlyEnforcementInterceptor(
    reflector as unknown as Reflector,
    { restrictedUntil },
  );
  const next = { handle: jest.fn(() => of('handled')) };

  function http(method: string, user?: { id: string }): ExecutionContext {
    return {
      getType: () => 'http',
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ method, user }) }),
    } as unknown as ExecutionContext;
  }

  function graphql(
    operation: string,
    user?: { id: string },
    parentType = operation === 'mutation' ? 'Mutation' : 'Query',
  ): ExecutionContext {
    const context = {
      getType: () => 'graphql',
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getInfo: () => ({
        operation: { operation },
        parentType: { name: parentType },
      }),
      getContext: () => ({ req: { user } }),
    } as unknown as GqlExecutionContext);
    return context;
  }

  beforeEach(() => {
    jest.restoreAllMocks();
    restrictedUntil.mockReset();
    reflector.getAllAndOverride.mockReset();
    next.handle.mockClear();
  });

  it('blocks a GraphQL mutation by a read-only subject', async () => {
    restrictedUntil.mockResolvedValue(until);
    await expect(
      lastValueFrom(
        interceptor.intercept(graphql('mutation', { id: 'u' }), next),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(next.handle).not.toHaveBeenCalled();
    expect(restrictedUntil.mock.calls[0][0]).toBe('u');
  });

  it('allows a GraphQL mutation for an unrestricted subject', async () => {
    restrictedUntil.mockResolvedValue(null);
    await expect(
      lastValueFrom(
        interceptor.intercept(graphql('mutation', { id: 'u' }), next),
      ),
    ).resolves.toBe('handled');
  });

  it('never consults restrictions for queries or anonymous mutations', async () => {
    await lastValueFrom(
      interceptor.intercept(graphql('query', { id: 'u' }), next),
    );
    await lastValueFrom(interceptor.intercept(graphql('mutation'), next));
    expect(restrictedUntil).not.toHaveBeenCalled();
    expect(next.handle).toHaveBeenCalledTimes(2);
  });

  it('does not treat nested field resolvers of a mutation as writes', async () => {
    restrictedUntil.mockResolvedValue(until);
    await expect(
      lastValueFrom(
        interceptor.intercept(
          graphql('mutation', { id: 'u' }, 'UserProfile'),
          next,
        ),
      ),
    ).resolves.toBe('handled');
    expect(restrictedUntil).not.toHaveBeenCalled();
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'blocks REST %s by a read-only subject',
    async (method) => {
      restrictedUntil.mockResolvedValue(until);
      await expect(
        lastValueFrom(interceptor.intercept(http(method, { id: 'u' }), next)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );

  it.each(['GET', 'HEAD', 'OPTIONS'])(
    'leaves REST %s untouched',
    async (method) => {
      await lastValueFrom(
        interceptor.intercept(http(method, { id: 'u' }), next),
      );
      expect(restrictedUntil).not.toHaveBeenCalled();
    },
  );

  it('lets operations marked as permitted through', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(
      lastValueFrom(
        interceptor.intercept(graphql('mutation', { id: 'u' }), next),
      ),
    ).resolves.toBe('handled');
    expect(restrictedUntil).not.toHaveBeenCalled();
  });
});
