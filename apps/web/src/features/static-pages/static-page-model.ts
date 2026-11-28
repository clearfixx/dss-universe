/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Static Pages
 * 📄 File: apps/web/src/features/static-pages/static-page-model.ts
 *
 * 🎯 Purpose:
 * Pure rules of the page form: suggested address, field checks and states.
 *
 * ⚠️ Important:
 * The API re-validates everything.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const PAGE_TITLE_MIN = 3;
export const PAGE_TITLE_MAX = 160;
export const PAGE_DESCRIPTION_MAX = 300;
export const PAGE_SLUG_MAX = 80;

const TRANSLIT: Record<string, string> = {
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
  ы: "y",
  э: "e",
  ё: "e",
  ъ: "",
};

/** A Latin address suggested from a title; may be empty. */
export function suggestSlug(title: string): string {
  return Array.from(title.toLowerCase())
    .map((char) => TRANSLIT[char] ?? char)
    .join("")
    .replace(/['’ʼ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, PAGE_SLUG_MAX)
    .replace(/-+$/, "");
}

export function pageFormError(
  input: Readonly<{ title: string; slug: string; description: string }>,
): string | null {
  const title = input.title.trim().length;
  if (title < PAGE_TITLE_MIN || title > PAGE_TITLE_MAX)
    return `Назва: від ${PAGE_TITLE_MIN} до ${PAGE_TITLE_MAX} символів.`;
  if (
    input.slug.length > PAGE_SLUG_MAX ||
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug)
  )
    return "Адреса: латинські літери, цифри та одинарні дефіси.";
  if (input.description.trim().length > PAGE_DESCRIPTION_MAX)
    return `Опис: не більше ${PAGE_DESCRIPTION_MAX} символів.`;
  return null;
}

export function pageStateLabel(
  page: Readonly<{ publishedAt?: unknown; hasUnpublishedChanges: boolean }>,
): string {
  if (!page.publishedAt) return "Чернетка";
  return page.hasUnpublishedChanges
    ? "Опубліковано, є неопубліковані зміни"
    : "Опубліковано";
}
