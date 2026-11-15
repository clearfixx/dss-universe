/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Consumption Persistence Test Fixtures
 * 📄 File: apps/api/test/helpers/gamification-consumption.fixture.ts
 * 🎯 Purpose: Builds isolated synthetic seals and legal past-due storage histories.
 * 🧠 Responsibilities: Controls database phases without sleeps, clock changes or trigger bypass.
 * 🏗️ Architecture: Bookkeeping fixture only; real producer admission is proved separately.
 * ⚠️ Important: Direct seal inserts do not attest production producer facts or execute owner effects.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { PrismaRoutingControlRepository } from '../../src/composition/gamification-delivery/infrastructure/prisma-routing-control.repository';
import { PrismaConsumptionRepository } from '../../src/composition/gamification-delivery/infrastructure/prisma-consumption.repository';
import { encodeAdmissionSeal } from '../../src/composition/gamification-delivery/infrastructure/admission-seal.codec';
import type { ConsumptionClaim } from '../../src/composition/gamification-delivery/contracts/consumption.types';
import { createIsolatedApiSchemaFixture } from './migrated-api-schema.fixture';

export async function createConsumptionFixture() {
  const base = await createIsolatedApiSchemaFixture();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${base.schema},public`,
  });
  const control = new PrismaRoutingControlRepository(
    base.prisma,
    new AuditWriterService(new AuditRedactionService()),
  );
  const operator = {
    actorId: 'synthetic:c21-consumption',
    actorType: 'SERVICE' as const,
  };
  await control.prepare(operator);
  const activation = await control.activate(
    operator,
    0n,
    'synthetic:storage-phase-proof',
  );
  if (!activation.cutoff) throw new Error('Missing fixture cutoff.');
  const cutoff = activation.cutoff;
  const consumption = new PrismaConsumptionRepository(base.prisma);

  async function add(priorFailures = 0) {
    const eventId = randomUUID(),
      factId = randomUUID(),
      id = randomUUID();
    const canonical = {
      eventId,
      eventName: 'reputation.direct.changed.v1',
      eventVersion: 1,
      producer: 'dss.api.reputation',
      sourceType: 'ReputationEntry',
      sourceId: `synthetic:${id}`,
      occurredAt: cutoff.toISOString(),
    };
    const scope = {
      producer: canonical.producer,
      sourceKind: 'ReputationEntry',
      sourceId: canonical.sourceId,
    };
    const encoded = encodeAdmissionSeal({
      codecVersion: 1,
      destination: 'gamification.v1',
      descriptor: { id: 'reputation.qualification', version: 1 },
      canonical,
      applicability: { POINTS: false, LEVELS: false, ACHIEVEMENTS: true },
      inputs: {
        ACHIEVEMENTS: {
          codec: 'achievements.qualified.v1',
          command: {
            event: {
              ...canonical,
              payload: { recipientId: `synthetic:${eventId}`, value: 1 },
            },
            facts: [
              {
                ...scope,
                factId,
                canonicalEventId: eventId,
                revision: '1',
                action: 'QUALIFY',
                qualificationId: factId,
                qualificationRevision: '1',
                qualificationEventId: eventId,
                qualificationFactId: factId,
                retiredThroughRevision: '0',
                predecessorWithdrawalFactId: null,
                contractVersion: 1,
              },
            ],
            contribution: { producer: scope.producer, factId },
          },
        },
      },
    });
    await base.prisma.outboxEvent.create({
      data: {
        id: eventId,
        eventName: canonical.eventName,
        eventVersion: 1,
        eventCategory: 'integration',
        producer: canonical.producer,
        payload: { recipientId: `synthetic:${eventId}`, value: 1 },
        occurredAt: cutoff,
        createdAt: new Date(cutoff.getTime() + 1),
      },
    });
    await base.prisma.gamificationDelivery.create({
      data: { destination: 'gamification.v1', eventId },
    });
    await base.prisma.gamificationAdmission.create({
      data: {
        id,
        destination: 'gamification.v1',
        eventId,
        cutoff,
        descriptorId: 'reputation.qualification',
        descriptorVersion: 1,
        codecVersion: 1,
        projection: JSON.parse(
          encoded.bytes.toString('utf8'),
        ) as Prisma.InputJsonValue,
        projectionDigest: new Uint8Array(encoded.digest),
        encodedBytes: encoded.encodedBytes,
      },
    });
    await base.prisma.gamificationConsumptionReceipt.create({
      data: {
        admissionId: id,
        destination: 'gamification.v1',
        availableAt: new Date(cutoff.getTime() - 60000),
        pointsDone: true,
        levelsDone: true,
        achievementsDone: false,
      },
    });
    // Construct valid past technical history. Actual failure timing is tested independently.
    for (let index = 0; index < priorFailures; index++) {
      const claim = await fixtureClaim(id, true);
      await pool.query(
        `UPDATE gamification_consumption_receipts SET state='RETRY_DUE',"technicalFailures"="technicalFailures"+1,
        "availableAt"=timezone('UTC',clock_timestamp())-interval '60 seconds',"claimToken"=NULL,"claimedAt"=NULL,"leaseUntil"=NULL WHERE "admissionId"=$1`,
        [id],
      );
      await pool.query(
        `UPDATE gamification_consumption_attempts SET state='FAILED',code='OWNER_FAILURE',"finishedAt"=timezone('UTC',clock_timestamp()) WHERE "claimToken"=$1`,
        [claim.token],
      );
    }
    return { id, scope };
  }
  // A legal fixture-controlled replacement is not proof that a future backoff elapsed.
  async function fixtureClaim(
    id: string,
    expired = false,
  ): Promise<ConsumptionClaim> {
    const token = randomUUID();
    const result = await pool.query<{
      epoch: string;
      claimSequence: string;
      claimedAt: Date;
      leaseUntil: Date;
    }>(
      `
      UPDATE gamification_consumption_receipts SET state='RUNNING',"availableAt"=NULL,"claimSequence"="claimSequence"+1,
        "claimToken"=$2,"claimedAt"=timezone('UTC',clock_timestamp())-($3::integer*interval '1 second'),
        "leaseUntil"=timezone('UTC',clock_timestamp())+($4::integer*interval '1 second')
      WHERE "admissionId"=$1 RETURNING epoch::text,"claimSequence"::text,"claimedAt","leaseUntil"`,
      [id, token, expired ? 120 : 0, expired ? -60 : 60],
    );
    const row = result.rows[0];
    await pool.query(
      `INSERT INTO gamification_consumption_attempts (id,"admissionId",epoch,"claimSequence","claimToken","startedAt")
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [randomUUID(), id, row.epoch, row.claimSequence, token, row.claimedAt],
    );
    return {
      admissionId: id,
      token,
      epoch: BigInt(row.epoch),
      sequence: BigInt(row.claimSequence),
      leaseUntil: row.leaseUntil.toISOString(),
    };
  }
  async function close() {
    try {
      await pool.end();
    } finally {
      await base.close();
    }
  }
  return {
    ...base,
    pool,
    control,
    operator,
    consumption,
    add,
    fixtureClaim,
    close,
  };
}
