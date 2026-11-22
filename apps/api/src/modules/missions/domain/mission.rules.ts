/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Missions
 * 📄 File: apps/api/src/modules/missions/domain/mission.rules.ts
 *
 * 🎯 Purpose:
 * Pure rules of community missions: the metric list, input validation and
 * the progress window.
 *
 * ⚠️ Important:
 * Owner decision (2026-11-22): staff define a mission with a metric from a
 * fixed list and a target; progress is counted automatically. No rewards.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export const MISSION_METRICS = [
  'TOPICS',
  'REPLIES',
  'ACCEPTED_ANSWERS',
  'REPUTATION',
] as const;
export type MissionMetric = (typeof MISSION_METRICS)[number];

export type MissionInput = {
  title: string;
  description: string | null;
  metric: MissionMetric;
  target: number;
  startsAt: Date;
  endsAt: Date;
  active: boolean;
};

export type Mission = MissionInput & {
  id: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

export const MISSION_LIMITS = {
  titleMin: 3,
  titleMax: 120,
  descriptionMax: 1000,
  targetMax: 100_000,
  windowMaxDays: 366,
} as const;

/** Trimmed copy of the input, or the first rule it breaks. */
export function validateMission(
  input: MissionInput,
): { ok: true; value: MissionInput } | { ok: false; error: string } {
  const title = input.title.trim();
  const description = input.description?.trim() || null;
  if (
    title.length < MISSION_LIMITS.titleMin ||
    title.length > MISSION_LIMITS.titleMax
  ) {
    return {
      ok: false,
      error: `Mission title must be ${MISSION_LIMITS.titleMin}–${MISSION_LIMITS.titleMax} characters.`,
    };
  }
  if (description && description.length > MISSION_LIMITS.descriptionMax) {
    return {
      ok: false,
      error: `Mission description must be at most ${MISSION_LIMITS.descriptionMax} characters.`,
    };
  }
  if (!MISSION_METRICS.includes(input.metric)) {
    return { ok: false, error: 'Mission metric is not supported.' };
  }
  if (
    !Number.isInteger(input.target) ||
    input.target < 1 ||
    input.target > MISSION_LIMITS.targetMax
  ) {
    return {
      ok: false,
      error: `Mission target must be a whole number 1–${MISSION_LIMITS.targetMax}.`,
    };
  }
  const start = input.startsAt.getTime();
  const end = input.endsAt.getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return { ok: false, error: 'Mission must end after it starts.' };
  }
  if (end - start > MISSION_LIMITS.windowMaxDays * 86_400_000) {
    return {
      ok: false,
      error: `Mission may last at most ${MISSION_LIMITS.windowMaxDays} days.`,
    };
  }
  return { ok: true, value: { ...input, title, description } };
}

/** Progress counts from the start until now, never past the end. */
export function progressWindow(
  mission: Pick<Mission, 'startsAt' | 'endsAt'>,
  now: Date,
): { since: Date; until: Date } | null {
  if (now.getTime() <= mission.startsAt.getTime()) return null;
  return {
    since: mission.startsAt,
    until: now < mission.endsAt ? now : mission.endsAt,
  };
}
