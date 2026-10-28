/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Database Verification
 * 📄 File: apps/api/src/core/database/services/prisma.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies connection lifecycle cleanup and unchanged failure identity.
 *
 * 🧠 Responsibilities:
 * • exercises real PrismaService hooks with mocked driver IO;
 * • rejects secret-bearing cleanup logs and successful-path disconnects.
 *
 * 🏗️ Architecture:
 * Core lifecycle unit tests; no PostgreSQL connection is opened.
 *
 * ⚠️ Important:
 * These tests prove cleanup attempts, not a previously observed TCP leak.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaService } from './prisma.service';

describe('Prisma connection lifecycle', () => {
  let prisma: PrismaService;
  let connect: jest.SpyInstance;
  let disconnect: jest.SpyInstance;
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    prisma = new PrismaService({
      adapter: new PrismaPg({
        connectionString:
          'postgresql://dss_test:dss_test@127.0.0.1:5434/dss_test',
      }),
    });
    connect = jest.spyOn(prisma, '$connect').mockResolvedValue(undefined);
    disconnect = jest.spyOn(prisma, '$disconnect').mockResolvedValue(undefined);
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  it('retains a successful connection until normal shutdown', async () => {
    await expect(prisma.onModuleInit()).resolves.toBeUndefined();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('Database connected');
    expect(warn).not.toHaveBeenCalled();
    await prisma.onModuleDestroy();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('Database disconnected');
  });

  it('attempts disconnect before returning the original connection failure', async () => {
    const failure = new Error('synthetic connection failure');
    connect.mockRejectedValueOnce(failure);
    await expect(prisma.onModuleInit()).rejects.toBe(failure);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('preserves a non-Error rejection without transforming it', async () => {
    const failure = Object.freeze({ code: 'SYNTHETIC_CONNECTION_FAILURE' });
    connect.mockRejectedValueOnce(failure);
    await expect(prisma.onModuleInit()).rejects.toBe(failure);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('keeps the connection failure when cleanup fails and logs no driver details', async () => {
    const original = new Error('synthetic connection failure');
    connect.mockRejectedValueOnce(original);
    disconnect.mockRejectedValueOnce(
      new Error('synthetic secret-bearing driver details'),
    );
    await expect(prisma.onModuleInit()).rejects.toBe(original);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
    expect(warn.mock.calls).toEqual([
      ['Database initialization cleanup failed.'],
    ]);
  });

  it('preserves normal shutdown failure behavior', async () => {
    const failure = new Error('synthetic shutdown failure');
    disconnect.mockRejectedValueOnce(failure);
    await expect(prisma.onModuleDestroy()).rejects.toBe(failure);
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
  });
});
