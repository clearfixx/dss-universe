/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Consumption Persistence
 * 📄 File: apps/api/src/composition/gamification-delivery/infrastructure/prisma-consumption.repository.ts
 * 🎯 Purpose: Persists current-token work claims, owner progress and technical outcomes.
 * 🧠 Responsibilities: Keeps receipt/attempt changes atomic and fences stale callbacks.
 * 🏗️ Architecture: Inactive root transaction adapter; no owner service or broker calls.
 * ⚠️ Important: Bookkeeping cannot cancel an owner transaction already executing.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService, type TransactionClient } from '@api/core/database';
import type {
  AchievementContinuation,
  ClaimSettlement,
  ConsumptionClaim,
  ConsumptionTechnicalCode,
  ConsumptionWork,
  GamificationConsumption,
  OwnerBlock,
  OwnerCompletion,
} from '../contracts/consumption.types';
import {
  CONSUMPTION_BATCH,
  CONSUMPTION_FAILURE_BUDGET,
  CONSUMPTION_LEASE_SECONDS,
  CONSUMPTION_TECHNICAL_CODES,
} from '../contracts/consumption.constants';
import { GAMIFICATION_DESTINATION as destination } from '../contracts/routing.constants';
import { assertBatch } from '../contracts/routing-validation';
import { lockActivation } from './activation-lock';
import {
  currentConsumptionQuery,
  dueConsumptionQuery,
  expiredConsumptionQuery,
} from './consumption-queries';
import {
  assertConsumptionClaim,
  assertOwnerBlock,
  assertOwnerCompletion,
  parseConsumptionProgress,
} from './consumption-validation';
import type { LockedConsumption } from './consumption-storage.types';
import { verifyAdmissionSeal } from './admission-seal.codec';
import { AdmissionCodecError } from './admission-codec.error';

function claimView(row: LockedConsumption): ConsumptionClaim {
  return {
    admissionId: row.admissionId,
    epoch: row.epoch,
    sequence: row.claimSequence,
    token: row.claimToken,
    leaseUntil: row.leaseUntil.toISOString(),
  };
}

@Injectable()
export class PrismaConsumptionRepository implements GamificationConsumption {
  constructor(private readonly prisma: PrismaService) {}

  async claim(limit = CONSUMPTION_BATCH): Promise<readonly ConsumptionClaim[]> {
    assertBatch(limit, CONSUMPTION_BATCH);
    return this.prisma.$transaction(async (transaction) => {
      const activation = await lockActivation(transaction);
      if (activation?.state !== 'ACTIVE') return [];
      const due = await transaction.$queryRaw<{ admissionId: string }[]>(
        dueConsumptionQuery(limit),
      );
      const claims: ConsumptionClaim[] = [];
      for (const candidate of due) {
        const token = randomUUID();
        const [row] = await transaction.$queryRaw<LockedConsumption[]>`
          WITH tick AS MATERIALIZED (SELECT timezone('UTC',clock_timestamp())::timestamp(3) AS now)
          UPDATE gamification_consumption_receipts SET state='RUNNING',"availableAt"=NULL,
            "claimSequence"="claimSequence"+1,"claimToken"=${token}::uuid,"claimedAt"=tick.now,
            "leaseUntil"=tick.now+${CONSUMPTION_LEASE_SECONDS}*interval '1 second',"updatedAt"=tick.now
          FROM tick WHERE destination=${destination} AND "admissionId"=${candidate.admissionId}::uuid
            AND state IN ('READY','RETRY_DUE')
          RETURNING "admissionId",epoch,"claimSequence","claimToken","claimedAt","leaseUntil",
            "technicalFailures","pointsDone","levelsDone","achievementsDone"`;
        if (!row) throw new Error('Consumption candidate lost under lock.');
        await transaction.$executeRaw`INSERT INTO gamification_consumption_attempts
          (id,"admissionId",epoch,"claimSequence","claimToken","startedAt")
          VALUES (${randomUUID()}::uuid,${row.admissionId}::uuid,${row.epoch},${row.claimSequence},${row.claimToken}::uuid,${row.claimedAt})`;
        claims.push(claimView(row));
      }
      return claims;
    });
  }

  async load(claim: ConsumptionClaim): Promise<ConsumptionWork | null> {
    assertConsumptionClaim(claim);
    return this.prisma.$transaction(async (transaction) => {
      const activation = await lockActivation(transaction);
      if (!activation?.cutoff || activation.state === 'PREPARED') return null;
      const [row] = await transaction.$queryRaw<LockedConsumption[]>(
        currentConsumptionQuery(claim),
      );
      return row ? this.work(transaction, row, activation.cutoff) : null;
    });
  }

  async completeOwner(
    claim: ConsumptionClaim,
    outcome: OwnerCompletion,
  ): Promise<ClaimSettlement> {
    assertOwnerCompletion(outcome);
    return this.withCurrent(claim, async (transaction, row) => {
      const field = (
        {
          POINTS: 'pointsDone',
          LEVELS: 'levelsDone',
          ACHIEVEMENTS: 'achievementsDone',
        } as const
      )[outcome.owner];
      if (row[field]) return 'APPLIED';
      const points = row.pointsDone || outcome.owner === 'POINTS';
      const levels = row.levelsDone || outcome.owner === 'LEVELS';
      const achievements =
        row.achievementsDone || outcome.owner === 'ACHIEVEMENTS';
      const complete = points && levels && achievements;
      await transaction.$executeRaw`UPDATE gamification_consumption_receipts SET
        "pointsDone"=${points},"levelsDone"=${levels},"achievementsDone"=${achievements},
        state=${complete ? 'COMPLETE' : 'RUNNING'},
        "claimToken"=CASE WHEN ${complete} THEN NULL ELSE "claimToken" END,
        "claimedAt"=CASE WHEN ${complete} THEN NULL ELSE "claimedAt" END,
        "leaseUntil"=CASE WHEN ${complete} THEN NULL ELSE "leaseUntil" END,
        "updatedAt"=timezone('UTC',clock_timestamp())
        WHERE "admissionId"=${row.admissionId}::uuid AND destination=${destination}`;
      if (complete)
        await this.finishAttempt(transaction, row, 'COMPLETE', null);
      return 'APPLIED';
    });
  }

  async continueOwner(
    claim: ConsumptionClaim,
    outcome: AchievementContinuation,
  ): Promise<ClaimSettlement> {
    if (!outcome || outcome.owner !== 'ACHIEVEMENTS')
      throw new TypeError('Invalid owner continuation.');
    const progress = parseConsumptionProgress(outcome.progress);
    return this.withCurrent(claim, async (transaction, row, cutoff) => {
      if (row.achievementsDone) return 'STALE';
      const work = await this.work(transaction, row, cutoff);
      this.assertScope(work, progress);
      await transaction.$executeRaw`INSERT INTO gamification_owner_progress ("admissionId",owner,"codecVersion",coordinates)
        VALUES (${row.admissionId}::uuid,'ACHIEVEMENTS',1,${JSON.stringify(progress)}::jsonb)
        ON CONFLICT ("admissionId",owner) DO UPDATE SET coordinates=EXCLUDED.coordinates,"updatedAt"=timezone('UTC',clock_timestamp())`;
      await this.release(
        transaction,
        row,
        'READY',
        null,
        row.technicalFailures,
        0,
      );
      await this.finishAttempt(transaction, row, 'CONTINUED', null);
      return 'APPLIED';
    });
  }

  async block(
    claim: ConsumptionClaim,
    outcome: OwnerBlock,
  ): Promise<ClaimSettlement> {
    assertOwnerBlock(outcome);
    return this.withCurrent(claim, async (transaction, row) => {
      if (row.achievementsDone) return 'STALE';
      const code = `${outcome.owner}:${outcome.code}`;
      await this.release(
        transaction,
        row,
        'BLOCKED',
        code,
        row.technicalFailures,
        0,
      );
      await this.finishAttempt(transaction, row, 'BLOCKED', code);
      return 'APPLIED';
    });
  }

  async fail(
    claim: ConsumptionClaim,
    code: ConsumptionTechnicalCode,
  ): Promise<ClaimSettlement> {
    if (!CONSUMPTION_TECHNICAL_CODES.includes(code))
      throw new TypeError('Invalid technical failure code.');
    return this.withCurrent(claim, async (transaction, row) => {
      await this.failure(transaction, row, code, 'FAILED');
      return 'APPLIED';
    });
  }

  async recover(limit = CONSUMPTION_BATCH): Promise<number> {
    assertBatch(limit, CONSUMPTION_BATCH);
    return this.prisma.$transaction(async (transaction) => {
      const activation = await lockActivation(transaction);
      if (!activation?.cutoff || activation.state === 'PREPARED') return 0;
      const rows = await transaction.$queryRaw<LockedConsumption[]>(
        expiredConsumptionQuery(limit),
      );
      for (const row of rows)
        await this.failure(transaction, row, 'LEASE_EXPIRED', 'EXPIRED');
      return rows.length;
    });
  }

  private async withCurrent(
    claim: ConsumptionClaim,
    action: (
      transaction: TransactionClient,
      row: LockedConsumption,
      cutoff: Date,
    ) => Promise<ClaimSettlement>,
  ): Promise<ClaimSettlement> {
    assertConsumptionClaim(claim);
    return this.prisma.$transaction(async (transaction) => {
      const activation = await lockActivation(transaction);
      if (!activation?.cutoff || activation.state === 'PREPARED')
        return 'STALE';
      const [row] = await transaction.$queryRaw<LockedConsumption[]>(
        currentConsumptionQuery(claim),
      );
      return row ? action(transaction, row, activation.cutoff) : 'STALE';
    });
  }

  private async work(
    transaction: TransactionClient,
    row: LockedConsumption,
    cutoff: Date,
  ): Promise<ConsumptionWork> {
    const stored = await transaction.gamificationAdmission.findUniqueOrThrow({
      where: { id: row.admissionId },
    });
    const seal = verifyAdmissionSeal(
      stored.projection,
      stored.projectionDigest,
      stored.encodedBytes,
    );
    if (
      stored.destination !== destination ||
      stored.eventId !== seal.canonical.eventId ||
      stored.cutoff.getTime() !== cutoff.getTime() ||
      stored.descriptorId !== seal.descriptor.id ||
      stored.descriptorVersion !== seal.descriptor.version ||
      stored.codecVersion !== seal.codecVersion ||
      (!seal.applicability.POINTS && !row.pointsDone) ||
      (!seal.applicability.LEVELS && !row.levelsDone)
    )
      throw new AdmissionCodecError('INVALID_QUALIFIED_PROJECTION');
    const storedProgress =
      await transaction.gamificationOwnerProgress.findUnique({
        where: {
          admissionId_owner: {
            admissionId: row.admissionId,
            owner: 'ACHIEVEMENTS',
          },
        },
      });
    const work: ConsumptionWork = {
      admissionId: row.admissionId,
      projection: seal,
      done: {
        POINTS: row.pointsDone,
        LEVELS: row.levelsDone,
        ACHIEVEMENTS: row.achievementsDone,
      },
      progress: storedProgress
        ? parseConsumptionProgress(storedProgress.coordinates)
        : null,
    };
    if (work.progress) this.assertScope(work, work.progress);
    return work;
  }

  private assertScope(
    work: ConsumptionWork,
    progress: AchievementContinuation['progress'],
  ): void {
    if (
      !work.projection.inputs.ACHIEVEMENTS.command.facts.some(
        (fact) =>
          fact.producer === progress.scope.producer &&
          fact.sourceKind === progress.scope.sourceKind &&
          fact.sourceId === progress.scope.sourceId,
      )
    )
      throw new TypeError('Owner progress scope is absent from admission.');
  }

  private async release(
    transaction: TransactionClient,
    row: LockedConsumption,
    state: 'READY' | 'RETRY_DUE' | 'BLOCKED',
    code: string | null,
    failures: number,
    delay: number,
  ) {
    await transaction.$executeRaw`WITH tick AS MATERIALIZED (SELECT timezone('UTC',clock_timestamp())::timestamp(3) AS now)
      UPDATE gamification_consumption_receipts SET state=${state},"blockCode"=${code},"technicalFailures"=${failures},
        "availableAt"=CASE WHEN ${state === 'BLOCKED'} THEN NULL ELSE tick.now+${delay}*interval '1 second' END,
        "claimToken"=NULL,"claimedAt"=NULL,"leaseUntil"=NULL,"updatedAt"=tick.now
      FROM tick WHERE destination=${destination} AND "admissionId"=${row.admissionId}::uuid`;
  }

  private async finishAttempt(
    transaction: TransactionClient,
    row: LockedConsumption,
    state: 'COMPLETE' | 'CONTINUED' | 'FAILED' | 'EXPIRED' | 'BLOCKED',
    code: string | null,
  ) {
    const changed =
      await transaction.$executeRaw`UPDATE gamification_consumption_attempts
      SET state=${state},code=${code},"finishedAt"=timezone('UTC',clock_timestamp())
      WHERE "admissionId"=${row.admissionId}::uuid AND epoch=${row.epoch}
        AND "claimSequence"=${row.claimSequence} AND "claimToken"=${row.claimToken}::uuid AND state='OPEN'`;
    if (changed !== 1)
      throw new Error('Consumption attempt missing under claim lock.');
  }

  private async failure(
    transaction: TransactionClient,
    row: LockedConsumption,
    code: ConsumptionTechnicalCode,
    state: 'FAILED' | 'EXPIRED',
  ) {
    const failures = row.technicalFailures + 1;
    const blocked = failures >= CONSUMPTION_FAILURE_BUDGET;
    await this.release(
      transaction,
      row,
      blocked ? 'BLOCKED' : 'RETRY_DUE',
      blocked ? code : null,
      failures,
      blocked ? 0 : 2 ** row.technicalFailures,
    );
    await this.finishAttempt(transaction, row, state, code);
  }
}
