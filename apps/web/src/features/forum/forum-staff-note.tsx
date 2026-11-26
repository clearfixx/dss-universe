/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-staff-note.tsx
 *
 * 🎯 Purpose:
 * Staff tag under a post (owner 2026-11-27): a framed note with a big role
 * letter on a coloured square — К curator, М moderator, С supermoderator,
 * А administrator — and the note text to the right.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { staffTag } from "./forum-staff-tags-model";

export function ForumStaffNote({
  note,
}: {
  note: Readonly<{ id: string; role: string; body: string }>;
}) {
  const tag = staffTag(note.role);
  return (
    <aside
      aria-label={tag.tag}
      className={`flex overflow-hidden rounded-lg bg-slate-950/50 ring-1 ${tag.ring}`}
    >
      <span
        aria-hidden="true"
        title={tag.label}
        className={`flex w-14 shrink-0 items-center justify-center font-serif text-4xl font-bold text-white sm:w-20 sm:text-5xl ${tag.square}`}
      >
        {tag.letter}
      </span>
      <div className="min-w-0 space-y-1 px-3 py-2.5 text-sm sm:px-4">
        <p className="sr-only">{tag.label}:</p>
        <p className="whitespace-pre-line break-words text-slate-200">
          {note.body}
        </p>
      </div>
    </aside>
  );
}
