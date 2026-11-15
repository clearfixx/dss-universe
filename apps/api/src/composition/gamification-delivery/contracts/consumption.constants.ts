/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Composition
 * 📄 File: apps/api/src/composition/gamification-delivery/contracts/consumption.constants.ts
 * 🎯 Purpose: Names inactive consumption capabilities and reviewed work budgets.
 * 🧠 Responsibilities: Separates technical retries from committed owner progress.
 * 🏗️ Architecture: Root technical constants; no owner or queue implementation.
 * ⚠️ Important: Declaring these values does not activate a consumer.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const GAMIFICATION_ADMISSION = Symbol('GAMIFICATION_ADMISSION');
export const GAMIFICATION_CONSUMPTION = Symbol('GAMIFICATION_CONSUMPTION');
export const CONSUMPTION_BATCH = 32;
export const CONSUMPTION_FAILURE_BUDGET = 5;
export const CONSUMPTION_LEASE_SECONDS = 60;
export const ADMISSION_CODEC_VERSION = 1;
export const ADMISSION_MAX_BYTES = 256 * 1024;
export const ADMISSION_STRING_MAX_BYTES = 16 * 1024;

export const ADMISSION_REJECTION_CODES = [
  'UNSUPPORTED_DESCRIPTOR',
  'UNSUPPORTED_EVENT_VERSION',
  'CONFIGURATION_REQUIRED',
  'CANONICAL_EVIDENCE_MISSING',
  'CANONICAL_EVIDENCE_MISMATCH',
  'PRODUCER_EVIDENCE_MISSING',
  'LEGACY_PROVENANCE_REQUIRED',
  'BLOCKED_LEGACY_MAPPING',
  'INVALID_QUALIFIED_PROJECTION',
  'PROJECTION_TOO_LARGE',
  'SEALED_IDENTITY_CONFLICT',
] as const;

export const CONSUMPTION_TECHNICAL_CODES = [
  'OWNER_UNAVAILABLE',
  'OWNER_FAILURE',
  'LEASE_EXPIRED',
  'SEAL_READ_FAILURE',
] as const;
