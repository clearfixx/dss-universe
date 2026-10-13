/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/delivery/bullmq-security-alert-delivery.spec.ts
 *
 * 🎯 Purpose:
 * Characterizes alert payload allowlisting and existing BullMQ delivery options.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { QueueRegistryService } from '@api/core/queue/services/queue-registry.service';
import { BullmqSecurityAlertDelivery } from './bullmq-security-alert-delivery';

describe('BullmqSecurityAlertDelivery', () => {
  const add = jest.fn();
  const delivery = new BullmqSecurityAlertDelivery({
    securityEmailAlerts: { add },
  } as unknown as QueueRegistryService);
  const alert = {
    eventId: 'synthetic-event-id',
    kind: 'PASSWORD_CHANGED' as const,
    email: 'astro@dss.test',
    occurredAt: '2026-10-11T12:00:00.000Z',
  };
  beforeEach(() => {
    add.mockReset().mockResolvedValue({});
  });
  it('preserves version, stable job identity and retry/cleanup options', async () => {
    await expect(delivery.enqueue(alert)).resolves.toBeUndefined();
    expect(add).toHaveBeenCalledWith('security-email-alert.v1', alert, {
      jobId: alert.eventId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  });
  it('does not copy undeclared fields from a runtime payload', async () => {
    const extended = {
      ...alert,
      unexpectedCredential: 'synthetic-never-send',
    };
    await delivery.enqueue(extended);
    const payload = (add.mock.calls[0] as [string, Record<string, unknown>])[1];
    expect(Object.keys(payload).sort()).toEqual([
      'email',
      'eventId',
      'kind',
      'occurredAt',
    ]);
    expect(payload).toEqual(alert);
  });
  it('propagates transport failure for application-owned best-effort handling', async () => {
    add.mockRejectedValueOnce(new Error('queue unavailable'));
    await expect(delivery.enqueue(alert)).rejects.toThrow('queue unavailable');
  });
});
