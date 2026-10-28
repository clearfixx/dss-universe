/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Persistence
 * 📄 File: apps/api/src/composition/gamification-delivery/infrastructure/prisma-routing-publication.repository.ts
 * 🎯 Purpose: Fences destination publication acknowledgements and stale recovery.
 * 🧠 Responsibilities: Claims due references and atomically preserves bounded failures.
 * 🏗️ Architecture: Technical database adapter; queue IO belongs to a later caller.
 * ⚠️ Important: Token fencing does not cancel an old queue call or award points.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService, type TransactionClient } from '@api/core/database';
import type {
  PublicationClaim,
  RoutingPublication,
} from '../contracts/routing.types';
import {
  GAMIFICATION_DESTINATION as destination,
  ROUTING_CLAIM_BATCH,
  ROUTING_LEASE_SECONDS,
  ROUTING_PUBLICATION_BUDGET,
} from '../contracts/routing.constants';
import { assertBatch, assertClaim } from '../contracts/routing-validation';
import { lockActivation } from './activation-lock';

@Injectable()
export class PrismaRoutingPublicationRepository implements RoutingPublication {
  constructor(private readonly prisma: PrismaService) {}
  async claim(
    limit = ROUTING_CLAIM_BATCH,
  ): Promise<readonly PublicationClaim[]> {
    assertBatch(limit, ROUTING_CLAIM_BATCH);
    return this.prisma.$transaction(async (tx) => {
      const activation = await lockActivation(tx);
      if (activation?.state !== 'ACTIVE') return [];
      const candidates = await tx.$queryRaw<{ eventId: string }[]>`
        SELECT "eventId" FROM gamification_deliveries
        WHERE destination=${destination} AND state='WAITING'
          AND "availableAt"<=timezone('UTC',clock_timestamp())
        ORDER BY "availableAt","eventId" LIMIT ${limit} FOR UPDATE SKIP LOCKED`;
      const claims: PublicationClaim[] = [];
      for (const candidate of candidates) {
        const claimToken = randomUUID();
        const [claim] = await tx.$queryRaw<PublicationClaim[]>`
          WITH tick AS MATERIALIZED (SELECT timezone('UTC',clock_timestamp()) AS now)
          UPDATE gamification_deliveries d SET state='CLAIMED',"claimToken"=${claimToken}::uuid,
            "claimedAt"=tick.now,"leaseUntil"=tick.now+${ROUTING_LEASE_SECONDS}*interval '1 second',
            "claimCount"=d."claimCount"+1,"cycleAttempts"=d."cycleAttempts"+1,"updatedAt"=tick.now
          FROM tick WHERE destination=${destination} AND "eventId"=${candidate.eventId}::uuid
          RETURNING "eventId","claimToken",cycle,"cycleAttempts" AS "cycleAttempt"`;
        claims.push(Object.freeze(claim));
      }
      return Object.freeze(claims);
    });
  }
  async acknowledge(claim: PublicationClaim): Promise<boolean> {
    assertClaim(claim);
    const affected = await this.prisma.$executeRaw`
      UPDATE gamification_deliveries SET state='QUEUED',"queuedAt"=timezone('UTC',clock_timestamp()),
        "claimToken"=NULL,"claimedAt"=NULL,"leaseUntil"=NULL,"updatedAt"=timezone('UTC',clock_timestamp())
      WHERE destination=${destination} AND "eventId"=${claim.eventId}::uuid
        AND state='CLAIMED' AND "claimToken"=${claim.claimToken}::uuid
        AND cycle=${claim.cycle} AND "cycleAttempts"=${claim.cycleAttempt}`;
    return affected === 1;
  }
  async fail(claim: PublicationClaim): Promise<boolean> {
    assertClaim(claim);
    return this.prisma.$transaction((tx) =>
      this.settleFailure(tx, claim, 'QUEUE_ADD_FAILED'),
    );
  }
  async recover(limit = ROUTING_CLAIM_BATCH): Promise<number> {
    assertBatch(limit, ROUTING_CLAIM_BATCH);
    return this.prisma.$transaction(async (tx) => {
      const activation = await lockActivation(tx);
      if (!activation || activation.state === 'PREPARED') return 0;
      const claims = await tx.$queryRaw<PublicationClaim[]>`
        SELECT "eventId","claimToken",cycle,"cycleAttempts" AS "cycleAttempt"
        FROM gamification_deliveries WHERE destination=${destination} AND state='CLAIMED'
          AND "leaseUntil"<=timezone('UTC',clock_timestamp())
        ORDER BY "leaseUntil","eventId" LIMIT ${limit} FOR UPDATE SKIP LOCKED`;
      let recovered = 0;
      for (const claim of claims) {
        if (await this.settleFailure(tx, claim, 'CLAIM_EXPIRED')) recovered++;
      }
      return recovered;
    });
  }
  private async settleFailure(
    tx: TransactionClient,
    claim: PublicationClaim,
    code: 'QUEUE_ADD_FAILED' | 'CLAIM_EXPIRED',
  ): Promise<boolean> {
    const affected = await tx.$executeRaw`
      WITH tick AS MATERIALIZED (SELECT timezone('UTC',clock_timestamp()) AS now)
      UPDATE gamification_deliveries d SET
        state=CASE WHEN d."cycleAttempts">=${ROUTING_PUBLICATION_BUDGET}
          THEN 'BLOCKED'::"GamificationPublicationState" ELSE 'WAITING'::"GamificationPublicationState" END,
        "availableAt"=CASE WHEN d."cycleAttempts">=${ROUTING_PUBLICATION_BUDGET} THEN tick.now
          ELSE tick.now+(1 << (d."cycleAttempts"-1))*interval '1 second' END,
        "claimToken"=NULL,"claimedAt"=NULL,"leaseUntil"=NULL,"updatedAt"=tick.now
      FROM tick WHERE destination=${destination} AND "eventId"=${claim.eventId}::uuid
        AND state='CLAIMED' AND "claimToken"=${claim.claimToken}::uuid
        AND cycle=${claim.cycle} AND "cycleAttempts"=${claim.cycleAttempt}`;
    if (affected !== 1) return false;
    await tx.gamificationPublicationFailure.create({
      data: {
        id: randomUUID(),
        destination,
        eventId: claim.eventId,
        claimToken: claim.claimToken,
        cycle: claim.cycle,
        cycleAttempt: claim.cycleAttempt,
        code,
      },
    });
    return true;
  }
}
