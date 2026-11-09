/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Admission Persistence
 * 📄 File: apps/api/src/composition/gamification-delivery/infrastructure/prisma-admission.repository.ts
 * 🎯 Purpose: Atomically seals verified producer facts under the current B claim.
 * 🧠 Responsibilities: Creates the initial receipt, reuses immutable seals and records bounded rejection.
 * 🏗️ Architecture: Inactive root transaction adapter; canonical and producer reads stay owner-owned.
 * ⚠️ Important: No owner command, network call, queue hint or activation is executed here.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService, type TransactionClient } from '@api/core/database';
import {
  CanonicalOutboxReader,
  type CanonicalOutboxEvidence,
} from '@api/core/events/infrastructure';
import { ReputationQualificationAdapter } from '../../reputation/infrastructure/reputation-qualification.adapter';
import type {
  AdmissionIdentity,
  AdmissionPreparation,
  AdmissionRejectionCode,
  ClaimSettlement,
  GamificationAdmission,
} from '../contracts/consumption.types';
import { ADMISSION_REJECTION_CODES } from '../contracts/consumption.constants';
import type { PublicationClaim } from '../contracts/routing.types';
import { GAMIFICATION_DESTINATION as destination } from '../contracts/routing.constants';
import { assertClaim } from '../contracts/routing-validation';
import { lockActivation } from './activation-lock';
import { lockPublicationClaim } from './publication-claim-lock';
import { AdmissionCodecError } from './admission-codec.error';
import {
  encodeAdmissionSeal,
  verifyAdmissionSeal,
} from './admission-seal.codec';

const allowedKeys = ['recipientId', 'value', 'reversesEntryId'] as const;
type StoredAdmission = {
  id: string;
  eventId: string;
  destination: string;
  cutoff: Date;
  descriptorId: string;
  descriptorVersion: number;
  codecVersion: number;
  projection: unknown;
  projectionDigest: Uint8Array;
  encodedBytes: number;
};
function identity(row: StoredAdmission): AdmissionIdentity {
  return {
    admissionId: row.id,
    eventId: row.eventId,
    destination: row.destination,
    cutoff: row.cutoff.toISOString(),
    descriptorId: row.descriptorId,
    descriptorVersion: row.descriptorVersion,
    codecVersion: row.codecVersion,
  };
}
function supported(event: CanonicalOutboxEvidence): boolean {
  return (
    event.producer === 'dss.api.reputation' &&
    event.category === 'integration' &&
    ['reputation.direct.changed.v1', 'reputation.direct.reversed.v1'].includes(
      event.name,
    )
  );
}

@Injectable()
export class PrismaAdmissionRepository implements GamificationAdmission {
  constructor(
    private readonly prisma: PrismaService,
    private readonly producer: ReputationQualificationAdapter,
    private readonly canonical: CanonicalOutboxReader,
  ) {}

  async prepare(claim: PublicationClaim): Promise<AdmissionPreparation> {
    assertClaim(claim);
    return this.prisma.$transaction(
      async (transaction) => {
        const activation = await lockActivation(transaction);
        if (
          !activation?.cutoff ||
          activation.state === 'PREPARED' ||
          !(await lockPublicationClaim(transaction, claim))
        )
          return { status: 'STALE_CLAIM' } as const;
        const existing = await transaction.gamificationAdmission.findUnique({
          where: {
            destination_eventId: { destination, eventId: claim.eventId },
          },
        });
        // Reuse the original seal before consulting a producer's newer mutable view.
        if (existing)
          return this.reuse(transaction, claim, activation.cutoff, existing);
        const event = await this.canonical.read(
          transaction,
          claim.eventId,
          allowedKeys,
        );
        let rejection: AdmissionRejectionCode | null = null;
        if (!event) rejection = 'CANONICAL_EVIDENCE_MISSING';
        else if (!supported(event)) rejection = 'UNSUPPORTED_DESCRIPTOR';
        else if (event.version !== 1) rejection = 'UNSUPPORTED_EVENT_VERSION';
        else if (Date.parse(event.createdAt) < activation.cutoff.getTime())
          rejection = 'CANONICAL_EVIDENCE_MISMATCH';
        if (rejection) return this.rejected(transaction, claim, rejection);
        const prepared = await this.producer.prepareInTransaction(
          transaction,
          claim.eventId,
        );
        if (prepared.status === 'BLOCKED') {
          const code: AdmissionRejectionCode =
            prepared.code === 'MISSING_PRODUCER_EVIDENCE'
              ? 'PRODUCER_EVIDENCE_MISSING'
              : prepared.code === 'INVALID_EVENT_ID'
                ? 'INVALID_QUALIFIED_PROJECTION'
                : prepared.code;
          return this.rejected(transaction, claim, code);
        }
        const source = prepared.command.event;
        let encoded: ReturnType<typeof encodeAdmissionSeal>;
        try {
          encoded = encodeAdmissionSeal({
            codecVersion: 1,
            destination,
            descriptor: { id: 'reputation.qualification', version: 1 },
            canonical: {
              eventId: source.eventId,
              eventName: source.eventName,
              eventVersion: source.eventVersion,
              producer: source.producer,
              sourceType: source.sourceType,
              sourceId: source.sourceId,
              occurredAt: source.occurredAt,
            },
            applicability: { POINTS: false, LEVELS: false, ACHIEVEMENTS: true },
            inputs: {
              ACHIEVEMENTS: {
                codec: 'achievements.qualified.v1',
                command: prepared.command,
              },
            },
          });
        } catch (error) {
          if (!(error instanceof AdmissionCodecError)) throw error;
          return this.rejected(transaction, claim, error.code);
        }
        const id = randomUUID();
        const seal = encoded.projection;
        await transaction.$executeRaw`INSERT INTO gamification_admissions
        (id,destination,"eventId",cutoff,"descriptorId","descriptorVersion","codecVersion",projection,"projectionDigest","encodedBytes")
        VALUES (${id}::uuid,${destination},${claim.eventId}::uuid,${activation.cutoff},
          ${seal.descriptor.id},${seal.descriptor.version},${seal.codecVersion},
          ${encoded.bytes.toString('utf8')}::jsonb,${encoded.digest},${encoded.encodedBytes})`;
        await transaction.$executeRaw`INSERT INTO gamification_consumption_receipts
        ("admissionId",destination,"availableAt","pointsDone","levelsDone","achievementsDone")
        VALUES (${id}::uuid,${destination},timezone('UTC',clock_timestamp()),
          ${!seal.applicability.POINTS},${!seal.applicability.LEVELS},${!seal.applicability.ACHIEVEMENTS})`;
        return {
          status: 'CREATED',
          admission: {
            admissionId: id,
            eventId: source.eventId,
            destination,
            cutoff: activation.cutoff.toISOString(),
            descriptorId: seal.descriptor.id,
            descriptorVersion: seal.descriptor.version,
            codecVersion: seal.codecVersion,
          },
        } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async rejectAdmission(
    claim: PublicationClaim,
    code: AdmissionRejectionCode,
  ): Promise<ClaimSettlement> {
    assertClaim(claim);
    if (!ADMISSION_REJECTION_CODES.includes(code))
      throw new TypeError('Invalid admission rejection code.');
    return this.prisma.$transaction(async (transaction) => {
      const activation = await lockActivation(transaction);
      if (
        !activation?.cutoff ||
        activation.state === 'PREPARED' ||
        !(await lockPublicationClaim(transaction, claim))
      )
        return 'STALE';
      await this.rejected(transaction, claim, code);
      return 'APPLIED';
    });
  }

  private async rejected(
    transaction: TransactionClient,
    claim: PublicationClaim,
    code: AdmissionRejectionCode,
  ) {
    await transaction.$executeRaw`INSERT INTO gamification_admission_rejections
      (id,destination,"eventId","claimToken",cycle,"cycleAttempt",code)
      VALUES (${randomUUID()}::uuid,${destination},${claim.eventId}::uuid,${claim.claimToken}::uuid,${claim.cycle},${claim.cycleAttempt},${code})`;
    const changed = await transaction.$executeRaw`UPDATE gamification_deliveries
      SET state='BLOCKED',"claimToken"=NULL,"claimedAt"=NULL,"leaseUntil"=NULL,
        "updatedAt"=timezone('UTC',clock_timestamp())
      WHERE destination=${destination} AND "eventId"=${claim.eventId}::uuid AND state='CLAIMED'
        AND "claimToken"=${claim.claimToken}::uuid AND cycle=${claim.cycle} AND "cycleAttempts"=${claim.cycleAttempt}`;
    if (changed !== 1)
      throw new Error('Admission publication claim lost under lock.');
    return { status: 'REJECTED', code } as const;
  }

  private async reuse(
    transaction: TransactionClient,
    claim: PublicationClaim,
    cutoff: Date,
    row: StoredAdmission,
  ): Promise<AdmissionPreparation> {
    const receipts = await transaction.$queryRaw<{ admissionId: string }[]>`
      SELECT "admissionId" FROM gamification_consumption_receipts
      WHERE "admissionId"=${row.id}::uuid AND destination=${destination} FOR UPDATE`;
    try {
      const seal = verifyAdmissionSeal(
        row.projection,
        row.projectionDigest,
        row.encodedBytes,
      );
      if (
        receipts.length !== 1 ||
        row.cutoff.getTime() !== cutoff.getTime() ||
        row.destination !== destination ||
        row.eventId !== seal.canonical.eventId ||
        row.descriptorId !== seal.descriptor.id ||
        row.descriptorVersion !== seal.descriptor.version ||
        row.codecVersion !== seal.codecVersion
      )
        return this.rejected(transaction, claim, 'SEALED_IDENTITY_CONFLICT');
      const current = await this.canonical.read(
        transaction,
        row.eventId,
        allowedKeys,
      );
      const expected = seal.inputs.ACHIEVEMENTS.command.event;
      if (
        !current ||
        !supported(current) ||
        current.version !== expected.eventVersion ||
        current.eventId !== expected.eventId ||
        current.name !== expected.eventName ||
        current.producer !== expected.producer ||
        current.aggregateType !== expected.sourceType ||
        current.aggregateId !== expected.sourceId ||
        current.occurredAt !== expected.occurredAt ||
        Date.parse(current.createdAt) < cutoff.getTime() ||
        !current.payload ||
        Object.keys(current.payload).length !==
          Object.keys(expected.payload).length ||
        Object.keys(expected.payload).some(
          (key) => current.payload?.[key] !== expected.payload[key],
        )
      )
        return this.rejected(transaction, claim, 'SEALED_IDENTITY_CONFLICT');
      return { status: 'REUSED', admission: identity(row) };
    } catch (error) {
      if (!(error instanceof AdmissionCodecError)) throw error;
      return this.rejected(transaction, claim, 'SEALED_IDENTITY_CONFLICT');
    }
  }
}
