/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/domain/moderation-sanction.rules.ts
 *
 * 🎯 Purpose:
 * Pure sanction rules: input normalization, expiry, activity and escalation.
 *
 * ⚠️ Important:
 * Database constraints repeat these bounds; both must change together.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ModerationSanctionError } from './errors/moderation-sanction.error';
import type {
  ModerationSanctionContext,
  ModerationSanctionPolicy,
  ModerationSanctionRecord,
} from './types/moderation-sanction.type';

const DAY_MS = 86_400_000;

export const DEFAULT_MODERATION_SANCTION_POLICY: ModerationSanctionPolicy = {
  warningLifetimeDays: 30,
  escalationWarningCount: 3,
  escalationReadOnlyDays: 7,
  readOnlyMaxDays: 365,
};

const POLICY_BOUNDS: Readonly<
  Record<keyof ModerationSanctionPolicy, readonly [number, number]>
> = {
  warningLifetimeDays: [1, 365],
  escalationWarningCount: [2, 20],
  escalationReadOnlyDays: [1, 365],
  readOnlyMaxDays: [1, 3650],
};

export function addDays(at: Date, days: number): Date {
  return new Date(at.getTime() + days * DAY_MS);
}

export function normalizeSanctionReason(
  value: string,
  label = 'Reason',
): string {
  const reason = value.trim();
  if (reason.length < 3 || reason.length > 1000) {
    throw new ModerationSanctionError(
      'INVALID_INPUT',
      `${label} must contain 3 to 1000 characters.`,
    );
  }
  return reason;
}

export function normalizeSanctionContext(
  input: {
    type?: string | null;
    id?: string | null;
    path?: string | null;
  } | null,
): ModerationSanctionContext | null {
  if (!input) return null;
  const type = input.type?.trim() ?? '';
  const id = input.id?.trim() ?? '';
  const path = input.path?.trim() || null;
  if (!type && !id && !path) return null;
  if (!type || !id || type.length > 64 || id.length > 128) {
    throw new ModerationSanctionError(
      'INVALID_INPUT',
      'Sanction context requires a type (≤64) and an id (≤128).',
    );
  }
  if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/.test(type)) {
    throw new ModerationSanctionError(
      'INVALID_INPUT',
      'Sanction context type must be a dotted lowercase owner identifier.',
    );
  }
  if (
    path !== null &&
    (path.length > 512 ||
      !path.startsWith('/') ||
      path.startsWith('//') ||
      /[\s\\]/.test(path))
  ) {
    throw new ModerationSanctionError(
      'INVALID_INPUT',
      'Sanction context path must be a site-relative path.',
    );
  }
  return { type, id, path };
}

export function validateSanctionPolicy(policy: ModerationSanctionPolicy): void {
  for (const key of Object.keys(POLICY_BOUNDS) as Array<
    keyof ModerationSanctionPolicy
  >) {
    const [min, max] = POLICY_BOUNDS[key];
    const value = policy[key];
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new ModerationSanctionError(
        'INVALID_INPUT',
        `${key} must be an integer between ${min} and ${max}.`,
      );
    }
  }
}

export function readOnlyExpiry(
  requested: Date,
  issuedAt: Date,
  policy: ModerationSanctionPolicy,
): Date {
  if (Number.isNaN(requested.getTime()) || requested <= issuedAt) {
    throw new ModerationSanctionError(
      'INVALID_INPUT',
      'Read-only expiry must be in the future.',
    );
  }
  if (requested > addDays(issuedAt, policy.readOnlyMaxDays)) {
    throw new ModerationSanctionError(
      'INVALID_INPUT',
      `Read-only may last at most ${policy.readOnlyMaxDays} days.`,
    );
  }
  return requested;
}

export function isSanctionActive(
  sanction: Pick<ModerationSanctionRecord, 'revokedAt' | 'expiresAt'>,
  at: Date,
): boolean {
  return sanction.revokedAt === null && sanction.expiresAt > at;
}

export function countsTowardEscalation(
  sanction: Pick<
    ModerationSanctionRecord,
    'kind' | 'revokedAt' | 'expiresAt' | 'consumedAt'
  >,
  at: Date,
): boolean {
  return (
    sanction.kind === 'WARNING' &&
    sanction.consumedAt === null &&
    isSanctionActive(sanction, at)
  );
}

export function shouldEscalate(
  activeWarnings: number,
  policy: ModerationSanctionPolicy,
): boolean {
  return activeWarnings >= policy.escalationWarningCount;
}

/** Rules first; consequences second; surprises never. */
