/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/forum-tags-model.ts
 *
 * 🎯 Purpose:
 * Pure helpers of the tag manager (P1 C03): a slug suggestion from a
 * Ukrainian or English label and the same validation the API applies.
 *
 * ⚠️ Important:
 * Mirrors the API rule (a-z, 0-9, hyphen, 1–40; label 1–40); the API stays
 * authoritative.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

const UK: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ie",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ь: "",
  ю: "iu",
  я: "ia",
  "’": "",
  "'": "",
};

export const TAG_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** "Next.js 16" → "next-js-16"; "Кешування" → "keshuvannia". */
export function suggestTagSlug(label: string): string {
  const latin = [...label.trim().toLowerCase()]
    .map((char) => UK[char] ?? char)
    .join("");
  return latin
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

/** Ukrainian message for the first problem, or null when valid. */
export function tagDraftError(draft: {
  slug: string;
  label: string;
}): string | null {
  const label = draft.label.trim();
  if (label.length < 1 || label.length > 40) {
    return "Назва тегу — від 1 до 40 символів.";
  }
  if (!TAG_SLUG_PATTERN.test(draft.slug.trim())) {
    return "Адреса тегу — латинські малі літери, цифри й дефіс (до 40).";
  }
  return null;
}
