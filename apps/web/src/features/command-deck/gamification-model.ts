/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/gamification-model.ts
 *
 * 🎯 Purpose:
 * Pure helpers of the XP rules screen: Ukrainian labels and categories for
 * the existing rule keys, and a safe order for level threshold updates.
 *
 * ⚠️ Important:
 * Unknown rule keys are shown as-is (new producers appear automatically).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type RuleCategory = Readonly<{ id: string; label: string }>;

const CATEGORIES: Record<string, RuleCategory> = {
  forum: { id: "forum", label: "Форум" },
  comment: { id: "comments", label: "Коментарі" },
  news: { id: "content", label: "Контент" },
  knowledge: { id: "content", label: "Контент" },
  reputation: { id: "reputation", label: "Репутація" },
};

const LABELS: Record<string, string> = {
  "forum.topic.created": "Створення теми",
  "forum.reply.created": "Написання відповіді",
  "forum.answer.accepted": "Прийнята відповідь (рішення)",
  "comment.created": "Коментар",
  "news.published": "Публікація новини",
  "knowledge.article.published": "Стаття в базі знань",
  "reputation.positive": "Отримання позитивної репутації",
  "reputation.negative": "Отримання негативної репутації",
};

export function ruleLabel(key: string): string {
  return LABELS[key] ?? key;
}

export function ruleCategory(key: string): RuleCategory {
  return CATEGORIES[key.split(".")[0]] ?? { id: "other", label: "Інше" };
}

export type LevelChange = { level: number; from: number; to: number };

/**
 * Thresholds must stay strictly increasing after every single update:
 * cuts go bottom-up, raises top-down.
 */
export function orderLevelChanges(
  changes: readonly LevelChange[],
): LevelChange[] {
  const cuts = changes
    .filter(({ to, from }) => to < from)
    .sort((a, b) => a.level - b.level);
  const raises = changes
    .filter(({ to, from }) => to > from)
    .sort((a, b) => b.level - a.level);
  return [...cuts, ...raises];
}
