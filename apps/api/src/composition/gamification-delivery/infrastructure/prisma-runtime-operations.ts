/** Trusted host operations and durable wake inventory. No public API routes. */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import type {
  ActivationView,
  RoutingOperator,
} from '../contracts/routing.types';
import { GAMIFICATION_DESTINATION as destination } from '../contracts/routing.constants';
import { assertBatch, assertOperator } from '../contracts/routing-validation';
import { CONSUMPTION_BATCH } from '../contracts/consumption.constants';
import { dueConsumptionQuery } from './consumption-queries';
import { lockActivation } from './activation-lock';
import { ActivationPreflightAdapter } from './activation-preflight.adapter';
import { lockGamificationConfiguration } from './configuration-lock';

import type { WakeReference } from '../contracts/runtime.types';
function assertRetry(id: string, revision: bigint, reason: string) {
  if (
    typeof id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    ) ||
    typeof revision !== 'bigint' ||
    revision < 0n ||
    revision >= 9223372036854775807n ||
    typeof reason !== 'string' ||
    reason.trim().length < 3 ||
    reason.length > 500
  )
    throw new TypeError('Invalid operational retry.');
}
@Injectable()
export class PrismaRuntimeOperations {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly readiness: ActivationPreflightAdapter,
  ) {}

  async state(): Promise<ActivationView | null> {
    return this.prisma.gamificationActivation.findUnique({
      where: { destination },
      select: { state: true, cutoff: true, revision: true },
    });
  }
  async preflight(): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await lockGamificationConfiguration(tx, true);
      await this.readiness.assert(tx);
    });
  }
  async dueWakes(limit = CONSUMPTION_BATCH): Promise<readonly WakeReference[]> {
    assertBatch(limit, CONSUMPTION_BATCH);
    return this.prisma.$transaction(async (tx) => {
      const activation = await lockActivation(tx);
      if (activation?.state !== 'ACTIVE') return [];
      const rows = await tx.$queryRaw<
        { admissionId: string; epoch: bigint; sequence: bigint }[]
      >`
        WITH due AS (${dueConsumptionQuery(limit, false)})
        SELECT r."admissionId",r.epoch,r."claimSequence" AS sequence
        FROM gamification_consumption_receipts r JOIN due USING ("admissionId")
        WHERE r.destination=${destination} ORDER BY r."availableAt",r."admissionId"`;
      return rows.map((row) => ({
        admissionId: row.admissionId,
        epoch: row.epoch.toString(),
        sequence: row.sequence.toString(),
      }));
    });
  }

  async retryConsumption(
    admissionId: string,
    epoch: bigint,
    reason: string,
    operator: RoutingOperator,
  ): Promise<void> {
    assertRetry(admissionId, epoch, reason);
    assertOperator(operator);
    await this.prisma.$transaction(async (tx) => {
      const activation = await lockActivation(tx);
      if (!activation?.cutoff) throw new Error('NOT_ACTIVATED');
      const [row] = await tx.$queryRaw<{ state: string; epoch: bigint }[]>`
        SELECT state,epoch FROM gamification_consumption_receipts
        WHERE destination=${destination} AND "admissionId"=${admissionId}::uuid FOR UPDATE`;
      if (!row || row.state !== 'BLOCKED' || row.epoch !== epoch)
        throw new Error('STALE_RETRY');
      await this.audit.append(tx, {
        action: 'gamification.consumption.retried',
        actorType: operator.actorType,
        actorId: operator.actorId,
        targetType: 'GamificationAdmission',
        targetId: admissionId,
        reason: reason.trim(),
        metadata: {
          previousEpoch: epoch.toString(),
          nextEpoch: (epoch + 1n).toString(),
        },
      });
      await tx.$executeRaw`UPDATE gamification_consumption_receipts
        SET state='READY',epoch=epoch+1,"technicalFailures"=0,"blockCode"=NULL,
          "availableAt"=timezone('UTC',clock_timestamp()),"updatedAt"=timezone('UTC',clock_timestamp())
        WHERE destination=${destination} AND "admissionId"=${admissionId}::uuid`;
    });
  }

  async retryPublication(
    eventId: string,
    cycle: bigint,
    reason: string,
    operator: RoutingOperator,
  ): Promise<void> {
    assertRetry(eventId, cycle, reason);
    if (cycle >= 2147483647n)
      throw new TypeError('Publication cycle exhausted.');
    assertOperator(operator);
    await this.prisma.$transaction(async (tx) => {
      const activation = await lockActivation(tx);
      if (!activation?.cutoff) throw new Error('NOT_ACTIVATED');
      const [row] = await tx.$queryRaw<{ state: string; cycle: number }[]>`
        SELECT state,cycle FROM gamification_deliveries
        WHERE destination=${destination} AND "eventId"=${eventId}::uuid FOR UPDATE`;
      if (!row || row.state !== 'BLOCKED' || BigInt(row.cycle) !== cycle)
        throw new Error('STALE_RETRY');
      await this.audit.append(tx, {
        action: 'gamification.publication.retried',
        actorType: operator.actorType,
        actorId: operator.actorId,
        targetType: 'GamificationDelivery',
        targetId: eventId,
        reason: reason.trim(),
        metadata: {
          previousCycle: cycle.toString(),
          nextCycle: (cycle + 1n).toString(),
        },
      });
      await tx.$executeRaw`UPDATE gamification_deliveries
        SET state='WAITING',cycle=cycle+1,"cycleAttempts"=0,"availableAt"=timezone('UTC',clock_timestamp()),
          "queuedAt"=NULL,"updatedAt"=timezone('UTC',clock_timestamp())
        WHERE destination=${destination} AND "eventId"=${eventId}::uuid`;
    });
  }
}
