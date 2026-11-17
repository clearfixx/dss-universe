import { ConfigService } from '@nestjs/config';
import { GamificationRuntimeRunner } from './infrastructure/gamification-runner';
import type { PrismaRuntimeOperations } from './infrastructure/prisma-runtime-operations';
import type { GamificationBroker } from './infrastructure/gamification-broker';
import type { GamificationDeliveryPump } from './application/delivery-pump';

function fixture(enabled = '1') {
  const operations = { preflight: jest.fn().mockResolvedValue(undefined) };
  const broker = {
    start: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };
  const pump = { tick: jest.fn().mockResolvedValue(undefined) };
  return {
    operations,
    broker,
    pump,
    service: new GamificationRuntimeRunner(
      new ConfigService({ DSS_GAMIFICATION_ENABLED: enabled }),
      operations as unknown as PrismaRuntimeOperations,
      broker as unknown as GamificationBroker,
      pump as unknown as GamificationDeliveryPump,
    ),
  };
}
describe('Headless gamification runner lifecycle', () => {
  afterEach(() => {
    jest.useRealTimers();
  });
  it('keeps the default disabled and opens no broker or work loop', async () => {
    const f = fixture('0');
    await f.service.start();
    expect(f.operations.preflight).not.toHaveBeenCalled();
    expect(f.broker.start).not.toHaveBeenCalled();
    expect(f.pump.tick).not.toHaveBeenCalled();
  });
  it('does not start the broker if readiness fails', async () => {
    const f = fixture();
    const failure = new Error('synthetic readiness failure');
    f.operations.preflight.mockRejectedValue(failure);
    await expect(f.service.start()).rejects.toBe(failure);
    expect(f.broker.start).not.toHaveBeenCalled();
  });
  it('prevents overlapping ticks and drains the current tick before broker shutdown', async () => {
    jest.useFakeTimers();
    const f = fixture();
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    f.pump.tick.mockReturnValue(held);
    await f.service.start();
    await expect(f.service.start()).rejects.toThrow('already started');
    await jest.advanceTimersByTimeAsync(6000);
    expect(f.pump.tick).toHaveBeenCalledTimes(1);
    const stopping = f.service.onApplicationShutdown();
    try {
      expect(f.broker.close).not.toHaveBeenCalled();
    } finally {
      release();
      await stopping;
    }
    expect(f.broker.close).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(2000);
    expect(f.pump.tick).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
