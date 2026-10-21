/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/security-alert.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies minimal notification requests and unchanged best-effort failure policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { SecurityAlertService } from './security-alert.service';
import type { SecurityEmailAlertJob } from '@dss/jobs';

describe('SecurityAlertService', () => {
  const add = jest.fn<Promise<void>, [Readonly<SecurityEmailAlertJob>]>();
  const service = new SecurityAlertService({
    enqueue: add,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    add.mockResolvedValue(undefined);
  });

  it('queues only the minimum security event payload', async () => {
    await service.notify('PASSWORD_CHANGED', ' Dev@Example.Test ');
    const call = add.mock.calls[0];
    expect(call?.[0].kind).toBe('PASSWORD_CHANGED');
    expect(call?.[0].email).toBe('dev@example.test');
    expect(call?.[0].eventId).toEqual(expect.any(String));
    expect(call?.[0].occurredAt).toEqual(expect.any(String));
    expect(Object.keys(call?.[0] ?? {}).sort()).toEqual([
      'email',
      'eventId',
      'kind',
      'occurredAt',
    ]);
  });

  it('does not turn an already committed credential change into a failure', async () => {
    add.mockRejectedValue(new Error('queue offline'));
    await expect(
      service.notify('EMAIL_CHANGED', 'dev@example.test'),
    ).resolves.toBeUndefined();
  });
});
