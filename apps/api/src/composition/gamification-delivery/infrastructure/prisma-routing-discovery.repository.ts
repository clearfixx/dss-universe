/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Persistence
 * 📄 File: apps/api/src/composition/gamification-delivery/infrastructure/prisma-routing-discovery.repository.ts
 * 🎯 Purpose: Atomically discovers references and advances bounded source cursors.
 * 🧠 Responsibilities: Preserves complete finite reconciliation and late commits.
 * 🏗️ Architecture: Root transaction composition over Core Events-owned facts.
 * ⚠️ Important: No payloads, queue submission, runner or historical backfill.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService, type TransactionClient } from '@api/core/database';
import {
  outboxRoutingUpper,
  outboxRoutingWindow,
} from '@api/core/events/infrastructure';
import type {
  DiscoveryResult,
  RoutingDiscovery,
} from '../contracts/routing.types';
import {
  GAMIFICATION_DESTINATION as destination,
  ROUTING_SOURCE_BATCH,
} from '../contracts/routing.constants';
import { assertBatch } from '../contracts/routing-validation';
import { lockActivation } from './activation-lock';

@Injectable()
export class PrismaRoutingDiscoveryRepository implements RoutingDiscovery {
  constructor(private readonly prisma: PrismaService) {}
  forward(limit = ROUTING_SOURCE_BATCH): Promise<DiscoveryResult> {
    return this.scan(false, limit);
  }
  reconcile(limit = ROUTING_SOURCE_BATCH): Promise<DiscoveryResult> {
    return this.scan(true, limit);
  }
  private scan(reconcile: boolean, limit: number): Promise<DiscoveryResult> {
    assertBatch(limit, ROUTING_SOURCE_BATCH);
    return this.prisma.$transaction(async (tx) => {
      const activation = await lockActivation(tx);
      if (!activation || activation.state === 'PREPARED')
        return {
          status: 'NOT_READY',
          examined: 0,
          inserted: 0,
          epochClosed: false,
        };
      let [state] = await tx.$queryRaw<
        { forwardAt: Date | null; sweepAt: Date | null; epochOpen: boolean }[]
      >`
        SELECT "forwardAt","sweepAt","epochOpen" FROM gamification_discovery
        WHERE destination=${destination} FOR UPDATE`;
      if (!state) throw new Error('Missing routing discovery state');
      const cutoff = Prisma.sql`(SELECT cutoff FROM gamification_activations WHERE destination=${destination})`;
      if (reconcile && !state.epochOpen) {
        const upper = outboxRoutingUpper(cutoff);
        const [opened] = await tx.$queryRaw<{ epochOpen: boolean }[]>`
          WITH upper_key AS MATERIALIZED (${upper})
          UPDATE gamification_discovery SET epoch=epoch+1,
            "upperAt"=(SELECT "sourceAt" FROM upper_key), "upperId"=(SELECT "eventId" FROM upper_key),
            "epochOpen"=EXISTS(SELECT 1 FROM upper_key),
            "epochStartedAt"=CASE WHEN EXISTS(SELECT 1 FROM upper_key) THEN timezone('UTC',clock_timestamp()) ELSE NULL END,
            "updatedAt"=timezone('UTC',clock_timestamp())
          WHERE destination=${destination} RETURNING "epochOpen"`;
        state = { ...state, epochOpen: opened.epochOpen, sweepAt: null };
        if (!state.epochOpen)
          return {
            status: 'SCANNED',
            examined: 0,
            inserted: 0,
            epochClosed: true,
          };
      }
      const after = reconcile
        ? state.sweepAt !== null
          ? Prisma.sql`(SELECT "sweepAt","sweepId" FROM gamification_discovery WHERE destination=${destination})`
          : undefined
        : state.forwardAt !== null
          ? Prisma.sql`(SELECT "forwardAt","forwardId" FROM gamification_discovery WHERE destination=${destination})`
          : undefined;
      const upper = reconcile
        ? Prisma.sql`(SELECT "upperAt","upperId" FROM gamification_discovery WHERE destination=${destination})`
        : undefined;
      const window = outboxRoutingWindow({ cutoff, after, upper, limit });
      const coordinateUpdate = reconcile
        ? Prisma.sql`"sweepAt"=last_key."sourceAt", "sweepId"=last_key."eventId"`
        : Prisma.sql`"forwardAt"=last_key."sourceAt", "forwardId"=last_key."eventId"`;
      const [result] = await tx.$queryRaw<
        { examined: number; inserted: number; atUpper: boolean }[]
      >`
        WITH candidates AS MATERIALIZED (${window}),
        inserted AS (
          INSERT INTO gamification_deliveries (destination,"eventId")
          SELECT ${destination},"eventId" FROM candidates ON CONFLICT DO NOTHING RETURNING "eventId"
        ), last_key AS (
          SELECT * FROM candidates ORDER BY "sourceAt" DESC,"eventId" DESC LIMIT 1
        ), progress AS (
          UPDATE gamification_discovery d SET ${coordinateUpdate},
            examined=d.examined+(SELECT count(*) FROM candidates),
            "lastProgressAt"=timezone('UTC',clock_timestamp()),"updatedAt"=timezone('UTC',clock_timestamp())
          FROM last_key WHERE d.destination=${destination}
          RETURNING (last_key."sourceAt",last_key."eventId")=(d."upperAt",d."upperId") AS "atUpper"
        ) SELECT (SELECT count(*)::int FROM candidates) AS examined,
          (SELECT count(*)::int FROM inserted) AS inserted,
          COALESCE((SELECT "atUpper" FROM progress),false) AS "atUpper"`;
      const epochClosed =
        reconcile && (result.examined === 0 || result.atUpper);
      if (epochClosed) await this.closeEpoch(tx);
      return {
        status: 'SCANNED',
        examined: result.examined,
        inserted: result.inserted,
        epochClosed,
      };
    });
  }
  private async closeEpoch(tx: TransactionClient): Promise<void> {
    await tx.$executeRaw`UPDATE gamification_discovery SET "epochOpen"=false,
      "sweepAt"=NULL,"sweepId"=NULL,"upperAt"=NULL,"upperId"=NULL,"epochStartedAt"=NULL,
      "updatedAt"=timezone('UTC',clock_timestamp()) WHERE destination=${destination}`;
  }
}
