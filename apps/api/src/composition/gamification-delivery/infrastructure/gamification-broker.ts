/** Dedicated API-owned queue; no Activity consumer identity or economic payload. */
import {
  Inject,
  Optional,
  Injectable,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import type IORedis from 'ioredis';
import { REDIS_CONNECTION } from '@api/core/cache';
import { GamificationCoordinator } from '../application/gamification-coordinator';
import type { GamificationWakeQueue } from '../application/delivery-pump';
import type { WakeReference } from '../contracts/runtime.types';

export const GAMIFICATION_QUEUE_NAME = 'dss.gamification.v1';
export const GAMIFICATION_BROKER_PREFIX = Symbol('GAMIFICATION_BROKER_PREFIX');
const JOB_NAME = 'wake-admission.v1';
export function validWake(value: unknown): value is WakeReference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    Object.keys(row).length === 3 &&
    typeof row.admissionId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      row.admissionId,
    ) &&
    [row.epoch, row.sequence].every(
      (part) =>
        typeof part === 'string' &&
        /^(0|[1-9][0-9]{0,18})$/.test(part) &&
        BigInt(part) <= 9223372036854775807n,
    )
  );
}
export function wakeJobId(reference: WakeReference): string {
  if (!validWake(reference)) throw new TypeError('Invalid gamification wake.');
  return `g-${reference.admissionId}-${reference.epoch}-${reference.sequence}`;
}

@Injectable()
export class GamificationBroker
  implements GamificationWakeQueue, OnApplicationShutdown
{
  private producer?: IORedis;
  private consumer?: IORedis;
  private queue?: Queue<WakeReference>;
  private worker?: Worker<WakeReference>;
  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
    private readonly coordinator: GamificationCoordinator,
    @Optional()
    @Inject(GAMIFICATION_BROKER_PREFIX)
    private readonly prefix = 'dss',
  ) {}
  async start(): Promise<void> {
    if (!/^[a-z0-9-]{1,80}$/.test(this.prefix))
      throw new TypeError('Invalid broker prefix.');
    if (this.queue || this.worker)
      throw new Error('Gamification broker already started.');
    try {
      await this.redis.ping();
      this.producer = this.redis.duplicate({
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      this.producer.on('error', () =>
        console.error('Gamification producer connection failure.'),
      );
      await this.producer.connect();
      this.queue = new Queue<WakeReference>(GAMIFICATION_QUEUE_NAME, {
        connection: this.producer,
        prefix: this.prefix,
      });
      this.queue.on('error', () =>
        console.error('Gamification queue failure.'),
      );
      await this.queue.waitUntilReady();
      this.consumer = this.redis.duplicate({
        lazyConnect: true,
        maxRetriesPerRequest: null,
      });
      this.consumer.on('error', () =>
        console.error('Gamification consumer connection failure.'),
      );
      this.worker = new Worker<WakeReference>(
        GAMIFICATION_QUEUE_NAME,
        async (job) => {
          if (job.name !== JOB_NAME || !validWake(job.data))
            throw new Error('INVALID_GAMIFICATION_WAKE');
          // The payload grants no claim or facts. Always claim current DB work.
          try {
            await this.coordinator.processOne();
          } catch {
            throw new Error('GAMIFICATION_PROCESSING_FAILED');
          }
        },
        {
          connection: this.consumer,
          prefix: this.prefix,
          concurrency: 2,
          autorun: false,
        },
      );
      this.worker.on('error', () =>
        console.error('Gamification broker failure.'),
      );
      await this.worker.waitUntilReady();
      void this.worker
        .run()
        .catch(() =>
          console.error('Gamification worker stopped unexpectedly.'),
        );
    } catch (error) {
      await this.close();
      throw error;
    }
  }
  async publish(reference: WakeReference): Promise<void> {
    const id = wakeJobId(reference);
    if (!this.queue) throw new Error('Gamification broker is not started.');
    await this.queue.add(JOB_NAME, reference, {
      jobId: id,
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
  async close(): Promise<void> {
    const worker = this.worker,
      queue = this.queue;
    const producer = this.producer,
      consumer = this.consumer;
    this.worker = undefined;
    this.queue = undefined;
    this.producer = undefined;
    this.consumer = undefined;
    await Promise.allSettled([worker?.close(), queue?.close()]);
    await Promise.allSettled(
      [producer, consumer].map(async (connection) => {
        if (!connection || connection.status === 'end') return;
        try {
          await connection.quit();
        } catch {
          connection.disconnect();
        }
      }),
    );
  }
  async onApplicationShutdown(): Promise<void> {
    await this.close();
  }
}
