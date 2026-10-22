/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: D5 Responsibility Verification
 * 📄 File: apps/api/src/core/cache/redis-lifecycle.service.spec.ts
 * 🎯 Purpose: Pins the existing behavior after private class extraction.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type IORedis from 'ioredis';
import { RedisLifecycleService } from './redis-lifecycle.service';

describe('RedisLifecycleService', () => {
  function subject(status: string) {
    const connection = {
      status,
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue('OK'),
    };
    return {
      connection,
      service: new RedisLifecycleService(connection as unknown as IORedis),
    };
  }
  it('connects only a waiting lazy connection', async () => {
    const { connection, service } = subject('wait');
    await service.onModuleInit();
    expect(connection.connect).toHaveBeenCalledTimes(1);
  });
  it.each(['ready', 'connecting', 'reconnecting', 'end'])(
    'does not reconnect %s during init',
    async (status) => {
      const { connection, service } = subject(status);
      await service.onModuleInit();
      expect(connection.connect).not.toHaveBeenCalled();
    },
  );
  it('quits a live connection once during shutdown', async () => {
    const { connection, service } = subject('ready');
    await service.onApplicationShutdown();
    expect(connection.quit).toHaveBeenCalledTimes(1);
  });
  it('does not quit an ended connection', async () => {
    const { connection, service } = subject('end');
    await service.onApplicationShutdown();
    expect(connection.quit).not.toHaveBeenCalled();
  });
  it('preserves initialization failure', async () => {
    const { connection, service } = subject('wait');
    const failure = new Error('synthetic connect failure');
    connection.connect.mockRejectedValue(failure);
    await expect(service.onModuleInit()).rejects.toBe(failure);
  });
  it('preserves shutdown failure', async () => {
    const { connection, service } = subject('ready');
    const failure = new Error('synthetic quit failure');
    connection.quit.mockRejectedValue(failure);
    await expect(service.onApplicationShutdown()).rejects.toBe(failure);
  });
});
