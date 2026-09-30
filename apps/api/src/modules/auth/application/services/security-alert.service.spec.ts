import { SecurityAlertService } from './security-alert.service';
import type { SecurityEmailAlertJob } from '@dss/jobs';

describe('SecurityAlertService', () => {
  const add = jest.fn<
    Promise<unknown>,
    [string, SecurityEmailAlertJob, Record<string, unknown>]
  >();
  const service = new SecurityAlertService({
    securityEmailAlerts: { add },
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    add.mockResolvedValue({});
  });

  it('queues only the minimum security event payload', async () => {
    await service.notify('PASSWORD_CHANGED', ' Dev@Example.Test ');
    const call = add.mock.calls[0];
    expect(call?.[0]).toBe('security-email-alert.v1');
    expect(call?.[1].kind).toBe('PASSWORD_CHANGED');
    expect(call?.[1].email).toBe('dev@example.test');
    expect(call?.[1].eventId).toEqual(expect.any(String));
    expect(call?.[1].occurredAt).toEqual(expect.any(String));
    expect(call?.[2]).toEqual(
      expect.objectContaining({ attempts: 5, removeOnComplete: true }),
    );
    expect(Object.keys(call?.[1] ?? {}).sort()).toEqual([
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
