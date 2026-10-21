/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/delivery/bullmq-password-recovery-delivery.spec.ts
 *
 * 🎯 Purpose:
 * Verifies delivery allowlisting, exact queue policy and error propagation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { QueueRegistryService } from '@api/core/queue/services/queue-registry.service';
import { BullmqPasswordRecoveryDelivery } from './bullmq-password-recovery-delivery';

describe('BullmqPasswordRecoveryDelivery', () => {
  const add = jest.fn();
  const delivery = new BullmqPasswordRecoveryDelivery({
    passwordRecovery: { add },
  } as unknown as QueueRegistryService);
  const request = {
    email: 'astro@dss.test',
    requestedAt: '2026-10-12T12:00:00.000Z',
  };
  beforeEach(() => {
    add.mockReset().mockResolvedValue({});
  });
  it('preserves the versioned payload and exact retry/cleanup options', async () => {
    await expect(delivery.enqueue(request)).resolves.toBeUndefined();
    expect(add).toHaveBeenCalledWith('password-recovery.v1', request, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  });
  it('does not copy undeclared runtime credential fields', async () => {
    const extended = {
      ...request,
      unexpectedCredential: 'synthetic-never-send',
    };
    await delivery.enqueue(extended);
    expect((add.mock.calls[0] as [string, Record<string, unknown>])[1]).toEqual(
      request,
    );
  });
  it('propagates queue failure to application policy', async () => {
    add.mockRejectedValueOnce(new Error('queue unavailable'));
    await expect(delivery.enqueue(request)).rejects.toThrow(
      'queue unavailable',
    );
  });
});
