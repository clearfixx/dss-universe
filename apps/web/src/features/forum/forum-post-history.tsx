"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-post-history.tsx
 *
 * 🎯 Purpose:
 * "Повідомлення відредагував …" line at the bottom of an edited post; it
 * opens the edit history: number, who, when, and (for the author and topic
 * staff) the unformatted text with the changes highlighted.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import Link from "next/link";
import { Fragment, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { getForumPostRevisions } from "./forum-actions";
import { forumMemberName } from "./forum-format";
import { wordDiff } from "./forum-staff-tags-model";

type History = Awaited<ReturnType<typeof getForumPostRevisions>>;

const dateFormatter = new Intl.DateTimeFormat("uk-UA", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function when(value: unknown) {
  return dateFormatter.format(new Date(String(value))).replace(",", "");
}

export function ForumPostHistory({
  postId,
  postNumber,
  editor,
  editedAt,
}: {
  postId: string;
  postNumber: number;
  editor: Readonly<{
    username: string;
    displayName?: string | null;
  }> | null;
  editedAt: unknown;
}) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<History | null>(null);
  const [shown, setShown] = useState<number | null>(null);

  function show(next: boolean) {
    setOpen(next);
    if (next && !history?.ok) {
      setHistory(null);
      void getForumPostRevisions(postId).then(setHistory);
    }
  }

  const items = history?.ok ? history.data : [];
  return (
    <>
      <button
        type="button"
        onClick={() => show(true)}
        className="text-left text-[11px] text-slate-500 hover:text-slate-300 hover:underline"
      >
        Повідомлення відредагував {editor ? forumMemberName(editor) : "—"}{" "}
        {when(editedAt)}
      </button>

      <Dialog open={open} onOpenChange={show}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Історія редагувань допису #{postNumber}</DialogTitle>
            <DialogDescription>
              Хто і коли змінював повідомлення.
            </DialogDescription>
          </DialogHeader>
          {!history ? (
            <p className="text-sm text-slate-400">Завантаження…</p>
          ) : !history.ok ? (
            <p className="text-sm text-slate-400">
              Не вдалося завантажити історію.
            </p>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-400">
                  <tr>
                    <th className="py-1.5 pr-3 font-medium">№</th>
                    <th className="py-1.5 pr-3 font-medium">Хто редагував</th>
                    <th className="py-1.5 pr-3 font-medium">Дата і час</th>
                    <th className="py-1.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {items.map((item, index) => {
                    const previous = index > 0 ? items[index - 1] : null;
                    const text = item.plainText;
                    return (
                      <Fragment key={item.revision}>
                        <tr>
                          <td className="py-2 pr-3 tabular-nums text-slate-400">
                            {item.revision}
                          </td>
                          <td className="py-2 pr-3">
                            {item.editor ? (
                              <Link
                                href={`/profile/${item.editor.username}`}
                                className="text-violet-300 hover:underline"
                              >
                                {forumMemberName(item.editor)}
                              </Link>
                            ) : (
                              "—"
                            )}
                            {index === 0 ? (
                              <span className="ml-1 text-xs text-slate-500">
                                (оригінал)
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2 pr-3 tabular-nums text-slate-300">
                            <time dateTime={String(item.createdAt)}>
                              {when(item.createdAt)}
                            </time>
                          </td>
                          <td className="py-2 text-right">
                            {text !== null && text !== undefined ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setShown(
                                    shown === item.revision
                                      ? null
                                      : item.revision,
                                  )
                                }
                                className="text-xs text-violet-300 hover:underline"
                              >
                                {shown === item.revision
                                  ? "Сховати"
                                  : index === 0
                                    ? "Текст"
                                    : "Зміни"}
                              </button>
                            ) : null}
                          </td>
                        </tr>
                        {shown === item.revision && text != null ? (
                          <tr>
                            <td colSpan={4} className="pb-3">
                              <p className="whitespace-pre-wrap break-words rounded-lg bg-slate-950/60 p-3 text-sm leading-relaxed text-slate-200">
                                {wordDiff(previous?.plainText ?? text, text).map(
                                  (part, key) =>
                                    part.kind === "same" ? (
                                      <span key={key}>{part.text}</span>
                                    ) : part.kind === "added" ? (
                                      <ins
                                        key={key}
                                        className="rounded bg-emerald-500/20 text-emerald-200 no-underline"
                                      >
                                        {part.text}
                                      </ins>
                                    ) : (
                                      <del
                                        key={key}
                                        className="rounded bg-rose-500/20 text-rose-200"
                                      >
                                        {part.text}
                                      </del>
                                    ),
                                )}
                              </p>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
