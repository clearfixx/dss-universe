/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/ranking-model.ts
 *
 * 🎯 Purpose:
 * «Гарячі» ranking preview for Command Deck › Рейтинг і XP (P1 C04): the
 * same formula as the API (forum-rating.rules hotScore) and its limits.
 *
 * ⚠️ Important:
 * Mirror of the API formula for the preview only; the API stays the source
 * of truth. Defaults reproduce today's ranking (owner decision D2).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type RankingSettings = Readonly<{
  hotGravitySeconds: number;
  hotReplyWeight: number;
}>;

export const DEFAULT_RANKING: RankingSettings = {
  hotGravitySeconds: 45_000,
  hotReplyWeight: 0,
};

/** API limits: gravity 1 hour…30 days (seconds), reply weight 0…10. */
export const GRAVITY_HOURS = { min: 1, max: 720 } as const;
export const REPLY_WEIGHT = { min: 0, max: 10 } as const;

export type RankableTopic = Readonly<{
  ratingUp: number;
  ratingDown: number;
  postCount: number;
  createdAt: unknown;
}>;

export function hotScore(
  topic: RankableTopic,
  settings: RankingSettings,
): number {
  const score = topic.ratingUp - topic.ratingDown;
  const order = Math.log10(Math.max(Math.abs(score), 1));
  const created = new Date(String(topic.createdAt)).getTime();
  return (
    Math.sign(score) * order +
    settings.hotReplyWeight * Math.log10(Math.max(topic.postCount, 1)) +
    created / 1000 / settings.hotGravitySeconds
  );
}

/** Topics in «Гарячі» order (ties: newer first), as the API sorts them. */
export function rankHot<T extends RankableTopic>(
  topics: readonly T[],
  settings: RankingSettings,
): T[] {
  return [...topics].sort(
    (a, b) =>
      hotScore(b, settings) - hotScore(a, settings) ||
      new Date(String(b.createdAt)).getTime() -
        new Date(String(a.createdAt)).getTime(),
  );
}

export function rankingError(settings: RankingSettings): string | null {
  const hours = settings.hotGravitySeconds / 3600;
  if (
    !Number.isInteger(settings.hotGravitySeconds) ||
    hours < GRAVITY_HOURS.min ||
    hours > GRAVITY_HOURS.max
  ) {
    return "Швидкість старіння — від 1 години до 30 днів.";
  }
  if (
    !Number.isInteger(settings.hotReplyWeight) ||
    settings.hotReplyWeight < REPLY_WEIGHT.min ||
    settings.hotReplyWeight > REPLY_WEIGHT.max
  ) {
    return "Вага відповідей — ціле число від 0 до 10.";
  }
  return null;
}
