/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-staff-tags-model.ts
 *
 * 🎯 Purpose:
 * Pure rules for staff tags under a post and for the post edit history
 * (owner 2026-11-27): a curator / moderator signs with the own tag, an
 * administrator may use any; the history shows what changed word by word.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type ForumStaffTagRole =
  | "CURATOR"
  | "MODERATOR"
  | "SUPERMODERATOR"
  | "ADMINISTRATOR";

export const STAFF_TAGS: Record<
  ForumStaffTagRole,
  { letter: string; label: string; tag: string; square: string; ring: string }
> = {
  CURATOR: {
    letter: "К",
    label: "Куратор",
    tag: "Тег куратора",
    square: "bg-emerald-600",
    ring: "ring-emerald-500/60",
  },
  MODERATOR: {
    letter: "М",
    label: "Модератор",
    tag: "Тег модератора",
    square: "bg-indigo-600",
    ring: "ring-indigo-500/60",
  },
  SUPERMODERATOR: {
    letter: "С",
    label: "Супермодератор",
    tag: "Тег супермодератора",
    square: "bg-violet-600",
    ring: "ring-violet-500/60",
  },
  ADMINISTRATOR: {
    letter: "А",
    label: "Адміністратор",
    tag: "Тег адміністратора",
    square: "bg-rose-600",
    ring: "ring-rose-500/60",
  },
};

const ORDER: ForumStaffTagRole[] = [
  "CURATOR",
  "MODERATOR",
  "SUPERMODERATOR",
  "ADMINISTRATOR",
];

export function staffTag(role: string) {
  return STAFF_TAGS[role as ForumStaffTagRole] ?? STAFF_TAGS.MODERATOR;
}

/** Tags the viewer may put on a post: the own one, or all for administrators. */
export function staffTagRoles(
  own: string | null | undefined,
): ForumStaffTagRole[] {
  if (own === "ADMINISTRATOR") return ORDER;
  return ORDER.includes(own as ForumStaffTagRole)
    ? [own as ForumStaffTagRole]
    : [];
}

export type DiffPart = { text: string; kind: "same" | "added" | "removed" };

/** Above this many tokens the LCS table gets too big; show a plain swap. */
const MAX_TOKENS = 3000;

/** Word-level diff (spaces kept) between two plain texts. */
export function wordDiff(before: string, after: string): DiffPart[] {
  const a = before.split(/(\s+)/).filter(Boolean);
  const b = after.split(/(\s+)/).filter(Boolean);
  if (a.length * b.length > (MAX_TOKENS * MAX_TOKENS) / 4) {
    return merge([
      ...(before ? [{ text: before, kind: "removed" as const }] : []),
      ...(after ? [{ text: after, kind: "added" as const }] : []),
    ]);
  }
  const width = b.length + 1;
  const lcs = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i * width + j] =
        a[i] === b[j]
          ? lcs[(i + 1) * width + j + 1] + 1
          : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
    }
  }
  const parts: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      parts.push({ text: a[i], kind: "same" });
      i += 1;
      j += 1;
    } else if (lcs[(i + 1) * width + j] >= lcs[i * width + j + 1]) {
      parts.push({ text: a[i], kind: "removed" });
      i += 1;
    } else {
      parts.push({ text: b[j], kind: "added" });
      j += 1;
    }
  }
  for (; i < a.length; i += 1) parts.push({ text: a[i], kind: "removed" });
  for (; j < b.length; j += 1) parts.push({ text: b[j], kind: "added" });
  return merge(parts);
}

function merge(parts: DiffPart[]): DiffPart[] {
  const merged: DiffPart[] = [];
  for (const part of parts) {
    const last = merged.at(-1);
    if (last && last.kind === part.kind) last.text += part.text;
    else merged.push({ ...part });
  }
  return merged;
}
