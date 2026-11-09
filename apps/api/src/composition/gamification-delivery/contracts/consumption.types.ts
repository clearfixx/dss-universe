/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Composition
 * 📄 File: apps/api/src/composition/gamification-delivery/contracts/consumption.types.ts
 * 🎯 Purpose: Describes fenced admission and consumption persistence commands.
 * 🧠 Responsibilities: Keeps exact claim coordinates and owned progress explicit.
 * 🏗️ Architecture: Root data contracts without ORM, Nest or broker APIs.
 * ⚠️ Important: A receipt flag records processing; it is not proof of an award.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { QualifiedAchievementOutcome } from '@api/modules/achievements';
import type {
  ADMISSION_REJECTION_CODES,
  CONSUMPTION_TECHNICAL_CODES,
} from './consumption.constants';
import type { PublicationClaim } from './routing.types';
import type { ReputationAdmissionSeal } from './admission-seal.types';

export type AdmissionRejectionCode = (typeof ADMISSION_REJECTION_CODES)[number];
export type ConsumptionTechnicalCode =
  (typeof CONSUMPTION_TECHNICAL_CODES)[number];
export type ConsumptionOwner = 'POINTS' | 'LEVELS' | 'ACHIEVEMENTS';

export type AdmissionIdentity = Readonly<{
  admissionId: string;
  eventId: string;
  destination: string;
  cutoff: string;
  descriptorId: string;
  descriptorVersion: number;
  codecVersion: number;
}>;

export type AdmissionPreparation =
  | Readonly<{ status: 'CREATED' | 'REUSED'; admission: AdmissionIdentity }>
  | Readonly<{ status: 'STALE_CLAIM' }>
  | Readonly<{ status: 'REJECTED'; code: AdmissionRejectionCode }>;

export type ConsumptionClaim = Readonly<{
  admissionId: string;
  epoch: bigint;
  sequence: bigint;
  token: string;
  leaseUntil: string;
}>;

export type OwnerCompletion =
  | Readonly<{
      owner: 'POINTS';
      disposition:
        | 'APPLIED'
        | 'ALREADY_PROCESSED'
        | 'NO_MATCH'
        | 'CAPPED'
        | 'NO_SOURCE_EFFECT';
    }>
  | Readonly<{
      owner: 'LEVELS';
      disposition: 'SYNCED' | 'ALREADY_PROCESSED' | 'NOT_APPLICABLE';
    }>
  | Readonly<{ owner: 'ACHIEVEMENTS'; disposition: 'COMPLETE' }>;

export type AchievementContinuation = Readonly<{
  owner: 'ACHIEVEMENTS';
  progress: Extract<
    QualifiedAchievementOutcome,
    { status: 'CONTINUE' }
  >['progress'];
}>;

export type OwnerBlock = Readonly<{
  owner: 'ACHIEVEMENTS';
  code: Extract<QualifiedAchievementOutcome, { status: 'BLOCKED' }>['code'];
}>;

export type ClaimSettlement = 'APPLIED' | 'STALE';

export type ConsumptionWork = Readonly<{
  admissionId: string;
  projection: ReputationAdmissionSeal;
  done: Readonly<{ POINTS: boolean; LEVELS: boolean; ACHIEVEMENTS: boolean }>;
  progress: AchievementContinuation['progress'] | null;
}>;

export interface GamificationAdmission {
  prepare(claim: PublicationClaim): Promise<AdmissionPreparation>;
  rejectAdmission(
    claim: PublicationClaim,
    code: AdmissionRejectionCode,
  ): Promise<ClaimSettlement>;
}

export interface GamificationConsumption {
  claim(limit?: number): Promise<readonly ConsumptionClaim[]>;
  load(claim: ConsumptionClaim): Promise<ConsumptionWork | null>;
  completeOwner(
    claim: ConsumptionClaim,
    outcome: OwnerCompletion,
  ): Promise<ClaimSettlement>;
  continueOwner(
    claim: ConsumptionClaim,
    outcome: AchievementContinuation,
  ): Promise<ClaimSettlement>;
  block(claim: ConsumptionClaim, outcome: OwnerBlock): Promise<ClaimSettlement>;
  fail(
    claim: ConsumptionClaim,
    code: ConsumptionTechnicalCode,
  ): Promise<ClaimSettlement>;
  recover(limit?: number): Promise<number>;
}
