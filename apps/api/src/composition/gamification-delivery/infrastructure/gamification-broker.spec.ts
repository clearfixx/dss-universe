import type IORedis from 'ioredis';
import { GamificationCoordinator } from '../application/gamification-coordinator';
import {
  GamificationBroker,
  validWake,
  wakeJobId,
} from './gamification-broker';
const mockQueue = {
  waitUntilReady: jest.fn(),
  on: jest.fn(),
  add: jest.fn(),
  close: jest.fn(),
};
const mockWorker = {
  waitUntilReady: jest.fn(),
  on: jest.fn(),
  run: jest.fn(),
  close: jest.fn(),
};
jest.mock('bullmq', () => ({
  Queue: jest.fn(() => mockQueue),
  Worker: jest.fn(() => mockWorker),
}));
const wake = {
  admissionId: '10000000-0000-0000-0000-000000000001',
  epoch: '0',
  sequence: '1',
};
function fixture() {
  const producer = {
    status: 'ready',
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
  };
  const consumer = {
    status: 'ready',
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
  };
  const redis = {
    ping: jest.fn().mockResolvedValue('PONG'),
    duplicate: jest
      .fn()
      .mockReturnValueOnce(producer)
      .mockReturnValueOnce(consumer),
  };
  const coordinator = {
    processOne: jest.fn(),
  } as unknown as GamificationCoordinator;
  return {
    producer,
    consumer,
    redis,
    service: new GamificationBroker(redis as unknown as IORedis, coordinator),
  };
}
describe('Gamification wake boundary and lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueue.waitUntilReady.mockReset().mockResolvedValue(undefined);
    mockQueue.add.mockReset().mockResolvedValue(undefined);
    mockQueue.close.mockReset().mockResolvedValue(undefined);
    mockWorker.waitUntilReady.mockReset().mockResolvedValue(undefined);
    mockWorker.run.mockReset().mockResolvedValue(undefined);
    mockWorker.close.mockReset().mockResolvedValue(undefined);
  });
  it.each([
    null,
    [],
    { ...wake, epoch: 1 },
    { ...wake, sequence: '01' },
    { ...wake, epoch: '9223372036854775808' },
    { ...wake, payload: {} },
    { ...wake, admissionId: 'opaque' },
  ])(
    'rejects an invalid wake without treating it as owner input: %p',
    (input) => {
      expect(validWake(input)).toBe(false);
    },
  );
  it('keeps exact epoch and sequence in the broker identity', () => {
    expect(validWake({ ...wake, epoch: '9223372036854775807' })).toBe(true);
    expect(wakeJobId(wake)).not.toBe(wakeJobId({ ...wake, epoch: '1' }));
    expect(wakeJobId(wake)).not.toBe(wakeJobId({ ...wake, sequence: '2' }));
  });
  it('removes finished hints so a still-due DB receipt can be woken again', async () => {
    const f = fixture();
    await f.service.start();
    await f.service.publish(wake);
    expect(mockQueue.add).toHaveBeenCalledWith('wake-admission.v1', wake, {
      jobId: wakeJobId(wake),
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: true,
    });
    await f.service.close();
    await f.service.close();
    expect(mockWorker.close).toHaveBeenCalledTimes(1);
    expect(f.producer.quit).toHaveBeenCalledTimes(1);
    expect(f.consumer.quit).toHaveBeenCalledTimes(1);
  });
  it('releases acquired resources after failed startup without masking the cause', async () => {
    const f = fixture();
    const failure = new Error('synthetic worker initialization failure');
    mockWorker.waitUntilReady.mockRejectedValue(failure);
    f.producer.quit.mockRejectedValue(new Error('synthetic quit failure'));
    await expect(f.service.start()).rejects.toBe(failure);
    expect(f.producer.disconnect).toHaveBeenCalledTimes(1);
    expect(f.consumer.quit).toHaveBeenCalledTimes(1);
    expect(mockWorker.close).toHaveBeenCalledTimes(1);
    expect(mockQueue.close).toHaveBeenCalledTimes(1);
    expect(f.redis.duplicate).toHaveBeenCalledTimes(2);
  });
});
