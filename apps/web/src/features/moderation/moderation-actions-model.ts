/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Moderation
 * 📄 File: apps/web/src/features/moderation/moderation-actions-model.ts
 *
 * 🎯 Purpose:
 * Ukrainian labels and links for moderator actions shown in the moderator
 * area overview.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

const LABELS: Readonly<Record<string, string>> = {
  "post.deleted": "Видалив допис",
  "post.hidden": "Приховав допис",
  "post.restored": "Відновив допис",
  "post.purged": "Остаточно видалив допис",
  "topic.trashed": "Переніс тему в кошик",
  "topic.restored": "Відновив тему",
  "topic.archived": "Архівував тему",
  "topic.unarchived": "Повернув тему з архіву",
  "topic.pinned": "Закріпив тему",
  "topic.unpinned": "Відкріпив тему",
  "topic.moved": "Переніс тему",
  "topic.split": "Розділив тему",
  "topic.reopened": "Відкрив тему знову",
};

export function moderationActionLabel(action: string): string {
  return LABELS[action] ?? action;
}

/** Topic link, anchored at the post when the action targets one. */
export function moderationActionHref(action: {
  topicId: string;
  postNumber: number | null;
}): string {
  const anchor = action.postNumber ? `#post-${action.postNumber}` : "";
  return `/community/forum/topics/${action.topicId}${anchor}`;
}
