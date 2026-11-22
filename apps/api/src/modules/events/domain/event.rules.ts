/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Events
 * 📄 File: apps/api/src/modules/events/domain/event.rules.ts
 *
 * 🎯 Purpose:
 * Pure rules of community events: input validation and "upcoming".
 *
 * ⚠️ Important:
 * Owner decision (2026-11-22): staff create events with simple fields;
 * no attendee registration.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export const EVENT_FORMATS = ['ONLINE', 'OFFLINE'] as const;
export type EventFormat = (typeof EVENT_FORMATS)[number];

export type EventInput = {
  title: string;
  description: string | null;
  startsAt: Date;
  durationMinutes: number;
  format: EventFormat;
  location: string | null;
  url: string | null;
};

export type CommunityEvent = EventInput & {
  id: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

export const EVENT_LIMITS = {
  titleMin: 3,
  titleMax: 120,
  descriptionMax: 2000,
  locationMax: 200,
  urlMax: 500,
  durationMaxMinutes: 7 * 24 * 60,
} as const;

function cleanUrl(value: string | null): string | null | false {
  const url = value?.trim() || null;
  if (!url) return null;
  if (url.length > EVENT_LIMITS.urlMax) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? parsed.toString()
      : false;
  } catch {
    return false;
  }
}

/** Trimmed copy of the input, or the first rule it breaks. */
export function validateEvent(
  input: EventInput,
): { ok: true; value: EventInput } | { ok: false; error: string } {
  const title = input.title.trim();
  const description = input.description?.trim() || null;
  const location = input.location?.trim() || null;
  const url = cleanUrl(input.url);
  if (
    title.length < EVENT_LIMITS.titleMin ||
    title.length > EVENT_LIMITS.titleMax
  ) {
    return {
      ok: false,
      error: `Event title must be ${EVENT_LIMITS.titleMin}–${EVENT_LIMITS.titleMax} characters.`,
    };
  }
  if (description && description.length > EVENT_LIMITS.descriptionMax) {
    return {
      ok: false,
      error: `Event description must be at most ${EVENT_LIMITS.descriptionMax} characters.`,
    };
  }
  if (Number.isNaN(input.startsAt.getTime())) {
    return { ok: false, error: 'Event start is invalid.' };
  }
  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < 1 ||
    input.durationMinutes > EVENT_LIMITS.durationMaxMinutes
  ) {
    return {
      ok: false,
      error: `Event duration must be 1–${EVENT_LIMITS.durationMaxMinutes} minutes.`,
    };
  }
  if (!EVENT_FORMATS.includes(input.format)) {
    return { ok: false, error: 'Event format is not supported.' };
  }
  if (url === false) {
    return { ok: false, error: 'Event link must be an http(s) address.' };
  }
  if (location && location.length > EVENT_LIMITS.locationMax) {
    return {
      ok: false,
      error: `Event place must be at most ${EVENT_LIMITS.locationMax} characters.`,
    };
  }
  if (input.format === 'ONLINE' && !url) {
    return { ok: false, error: 'An online event needs a link.' };
  }
  if (input.format === 'OFFLINE' && !location) {
    return { ok: false, error: 'An offline event needs a place.' };
  }
  return {
    ok: true,
    value: { ...input, title, description, location, url },
  };
}

export function eventEndsAt(
  event: Pick<EventInput, 'startsAt' | 'durationMinutes'>,
): Date {
  return new Date(event.startsAt.getTime() + event.durationMinutes * 60_000);
}

/** Not finished yet: upcoming or happening now. */
export function isUpcoming(
  event: Pick<EventInput, 'startsAt' | 'durationMinutes'>,
  now: Date,
): boolean {
  return eventEndsAt(event).getTime() > now.getTime();
}
