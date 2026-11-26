/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-reputation-model.ts
 *
 * 🎯 Purpose:
 * Pure rules for member reputation in the forum (owner 2026-11-26): reason
 * limits, where a journal entry was made, and Ukrainian error texts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export const REPUTATION_REASON_MIN = 3;
export const REPUTATION_REASON_MAX = 500;

export function reputationReasonError(reason: string): string | null {
  const length = reason.trim().length;
  if (length < REPUTATION_REASON_MIN) {
    return `Вкажіть причину: щонайменше ${REPUTATION_REASON_MIN} символи.`;
  }
  if (length > REPUTATION_REASON_MAX) {
    return `Причина задовга: до ${REPUTATION_REASON_MAX} символів.`;
  }
  return null;
}

export type ReputationSourceView = Readonly<{
  type: string;
  id: string;
  deleted: boolean;
}>;

/** «Where» column of the journal: a link to the post or a plain label. */
export function reputationPlace(source: ReputationSourceView | null): {
  label: string;
  href: string | null;
} {
  if (!source) return { label: "Профіль", href: null };
  if (source.type === "FORUM_POST") {
    return source.deleted
      ? { label: "Форум. Повідомлення видалене", href: null }
      : {
          label: "Форум: повідомлення",
          href: `/community/forum/posts/${source.id}`,
        };
  }
  return { label: "—", href: null };
}

/** Ukrainian text for API errors of giveReputation. */
export function reputationErrorMessage(code: string, fallback: string): string {
  switch (code) {
    case "CONFLICT":
      return "Ви вже змінювали репутацію за це повідомлення.";
    case "NOT_FOUND":
      return "Повідомлення недоступне.";
    case "NOT_SIGNED_IN":
      return "Увійдіть, щоб змінювати репутацію.";
    case "INVALID_INPUT":
      return /days old/i.test(fallback)
        ? "Ваш акаунт ще занадто новий, щоб змінювати репутацію."
        : /blocked/i.test(fallback)
          ? "Репутація недоступна між заблокованими учасниками."
          : "Не вдалося змінити репутацію. Перевірте причину.";
    default:
      return "Не вдалося змінити репутацію. Спробуйте ще раз.";
  }
}
