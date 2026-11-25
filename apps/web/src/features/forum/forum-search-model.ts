/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-search-model.ts
 *
 * 🎯 Purpose:
 * Pure helpers of the Community Hub search page: term normalisation,
 * highlighted excerpt segments and page parsing.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type SearchTab = "topics" | "news";

export type SearchSegment = Readonly<{ text: string; match: boolean }>;

/** Trimmed term, collapsed spaces, cut to the API limit. */
export function normalizeSearchTerm(value: unknown, max = 100): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

/** Splits text around case-insensitive occurrences of the term. */
export function searchSegments(text: string, term: string): SearchSegment[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return text ? [{ text, match: false }] : [];
  const lower = text.toLowerCase();
  const segments: SearchSegment[] = [];
  let from = 0;
  for (
    let at = lower.indexOf(needle);
    at >= 0;
    at = lower.indexOf(needle, from)
  ) {
    if (at > from) segments.push({ text: text.slice(from, at), match: false });
    segments.push({ text: text.slice(at, at + needle.length), match: true });
    from = at + needle.length;
  }
  if (from < text.length)
    segments.push({ text: text.slice(from), match: false });
  return segments;
}

export function searchTab(value: unknown): SearchTab {
  return value === "news" ? "news" : "topics";
}

export function searchPage(value: unknown): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 1 ? Math.min(page, 1000) : 1;
}
