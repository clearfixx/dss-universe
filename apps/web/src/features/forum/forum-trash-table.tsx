"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-trash-table.tsx
 *
 * 🎯 Purpose:
 * Forum trash table (P1 B07): trashed topics with section and who moved
 * them, row selection, single and bulk restore.
 *
 * ⚠️ Important:
 * The API re-checks moderation for every restore. Permanent deletion (B10)
 * is not offered: purge is reserved to the platform owner (owner decision
 * 2026-11-26) and stays off until the verified owner identity and the
 * backup/retention policy exist.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { MessageSquare, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cn } from "@/lib/utils";

import { setForumTopicTrashed } from "./forum-actions";
import { ForumAvatar } from "./forum-avatar";
import type { ForumTrashPage } from "./forum-data";
import { forumAgo, forumMemberName } from "./forum-format";

type Row = ForumTrashPage["items"][number];

const PATH = "/community/moderation/trash";

export function ForumTrashTable({
  items,
  sections,
}: {
  items: readonly Row[];
  sections: Readonly<Record<string, string>>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const allSelected = items.length > 0 && selected.size === items.length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function restore(ids: readonly string[]) {
    setMessage(null);
    start(async () => {
      let restored = 0;
      for (const id of ids) {
        const result = await setForumTopicTrashed(id, false, PATH);
        if (!result.ok) {
          setMessage(
            `Відновлено ${restored} з ${ids.length}. ${result.error.message}`,
          );
          router.refresh();
          return;
        }
        restored += 1;
      }
      setSelected(new Set());
      setMessage(
        restored === 1 ? "Тему відновлено." : `Відновлено тем: ${restored}.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {message ? (
        <p
          role="status"
          className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-slate-200"
        >
          {message}
        </p>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-card">
        <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_12rem_13rem_3rem] items-center gap-3 border-b border-white/[0.07] px-3 py-2.5 text-xs text-slate-400 md:grid">
          <input
            type="checkbox"
            aria-label="Вибрати всі"
            checked={allSelected}
            onChange={() =>
              setSelected(
                allSelected ? new Set() : new Set(items.map(({ id }) => id)),
              )
            }
            className="size-4 accent-violet-500"
          />
          <span>Тема</span>
          <span>Розділ</span>
          <span>Видалено</span>
          <span className="sr-only">Дії</span>
        </div>
        <ul>
          {items.map((topic) => {
            const replies = Math.max(0, topic.postCount - 1);
            return (
              <li
                key={topic.id}
                className={cn(
                  "grid grid-cols-[2.5rem_minmax(0,1fr)_3rem] items-center gap-x-3 gap-y-1 border-b border-white/[0.05] px-3 py-3 last:border-b-0 md:grid-cols-[2.5rem_minmax(0,1fr)_12rem_13rem_3rem]",
                  selected.has(topic.id) && "bg-primary/10",
                )}
              >
                <input
                  type="checkbox"
                  aria-label={`Вибрати «${topic.title}»`}
                  checked={selected.has(topic.id)}
                  onChange={() => toggle(topic.id)}
                  className="size-4 accent-violet-500"
                />
                <div className="min-w-0">
                  <Link
                    href={`/community/forum/topics/${topic.id}`}
                    className="block truncate font-medium text-white hover:text-violet-200"
                  >
                    {topic.title}
                  </Link>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="size-3.5" aria-hidden="true" />
                      {replies}
                    </span>
                    <span>Автор: {forumMemberName(topic.author)}</span>
                    <span className="md:hidden">
                      · {sections[topic.forumId] ?? "Розділ"} ·{" "}
                      {topic.trashedAt ? forumAgo(topic.trashedAt) : "—"}
                    </span>
                  </span>
                </div>
                <span className="hidden truncate text-sm text-slate-300 md:block">
                  {sections[topic.forumId] ?? "—"}
                </span>
                <span className="hidden min-w-0 items-center gap-2 md:flex">
                  {topic.trashedBy ? (
                    <ForumAvatar
                      member={topic.trashedBy}
                      className="size-8 text-[11px]"
                    />
                  ) : null}
                  <span className="min-w-0 text-xs">
                    <span className="block truncate text-slate-200">
                      {topic.trashedBy
                        ? forumMemberName(topic.trashedBy)
                        : "Невідомо"}
                    </span>
                    <span className="block text-slate-500">
                      {topic.trashedAt ? forumAgo(topic.trashedAt) : "—"}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => restore([topic.id])}
                  title="Відновити"
                  aria-label={`Відновити «${topic.title}»`}
                  className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-slate-200 hover:border-violet-400 disabled:opacity-50"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.07] bg-card px-4 py-3">
        <span className="text-sm text-slate-300">Вибрано: {selected.size}</span>
        <button
          type="button"
          disabled={pending || selected.size === 0}
          onClick={() => restore([...selected])}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-medium text-white hover:border-violet-400 disabled:opacity-50"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {pending ? "Відновлюємо…" : "Відновити вибрані"}
        </button>
        <span
          aria-disabled="true"
          title="Лише для власника платформи — з’явиться разом із підтвердженим власником і політикою резервних копій"
          className="inline-flex h-10 cursor-default items-center gap-2 rounded-lg border border-white/[0.07] px-4 text-sm text-slate-500"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Видалити остаточно
        </span>
      </div>
    </div>
  );
}
