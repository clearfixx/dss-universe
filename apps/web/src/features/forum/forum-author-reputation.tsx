"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-author-reputation.tsx
 *
 * 🎯 Purpose:
 * Member reputation on the post author card (owner 2026-11-26): «−» and
 * «+» open a dialog asking for the reason; the number opens the public
 * journal — who, why, when and where (link to the post, or «Форум.
 * Повідомлення видалене»).
 *
 * ⚠️ Important:
 * One change per member per post and the account-age rule are enforced by
 * the API. Post rating («Добре / Погано») is separate and never feeds this.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { getReputationJournal, giveForumPostReputation } from "./forum-actions";
import { forumMemberName } from "./forum-format";
import {
  REPUTATION_REASON_MAX,
  reputationErrorMessage,
  reputationPlace,
  reputationReasonError,
} from "./forum-reputation-model";

type Journal = Awaited<ReturnType<typeof getReputationJournal>>;

const numberFormatter = new Intl.NumberFormat("uk-UA");
const dateFormatter = new Intl.DateTimeFormat("uk-UA", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ForumAuthorReputation({
  postId,
  authorId,
  authorName,
  reputation,
  viewerId,
  path,
}: {
  postId: string;
  authorId: string;
  authorName: string;
  reputation: number;
  viewerId: string | null;
  path: string;
}) {
  const [score, setScore] = useState(reputation);
  const [given, setGiven] = useState(false);
  const [value, setValue] = useState<1 | -1 | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [journalOpen, setJournalOpen] = useState(false);
  const [journal, setJournal] = useState<Journal | null>(null);

  const own = viewerId === authorId;
  const disabledReason =
    viewerId === null
      ? "Увійдіть, щоб змінювати репутацію"
      : own
        ? "Свою репутацію змінювати не можна"
        : given
          ? "Ви вже змінили репутацію за це повідомлення"
          : null;

  function openChange(next: 1 | -1) {
    setValue(next);
    setReason("");
    setError(null);
  }

  function submit() {
    if (value === null) return;
    const invalid = reputationReasonError(reason);
    if (invalid) {
      setError(invalid);
      return;
    }
    start(async () => {
      const result = await giveForumPostReputation(
        postId,
        authorId,
        value,
        reason,
        path,
      );
      if (result.ok) {
        setScore((current) => current + value);
        setGiven(true);
        setJournal(null);
        setValue(null);
      } else {
        setError(
          reputationErrorMessage(result.error.code, result.error.message),
        );
      }
    });
  }

  function showJournal(next: boolean) {
    setJournalOpen(next);
    if (next && !journal) {
      void getReputationJournal(authorId).then(setJournal);
    }
  }

  const step =
    "flex size-5 items-center justify-center rounded text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <span className="inline-flex items-center gap-0.5">
      <button
        type="button"
        className={step}
        onClick={() => openChange(-1)}
        disabled={disabledReason !== null}
        title={disabledReason ?? "Знизити репутацію"}
        aria-label={`Знизити репутацію: ${authorName}`}
      >
        <Minus className="size-3" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => showJournal(true)}
        title="Журнал репутації"
        className={`min-w-5 rounded px-1 tabular-nums underline-offset-2 hover:underline ${
          score < 0 ? "text-rose-300" : "text-slate-200"
        }`}
      >
        {numberFormatter.format(score)}
      </button>
      <button
        type="button"
        className={step}
        onClick={() => openChange(1)}
        disabled={disabledReason !== null}
        title={disabledReason ?? "Підвищити репутацію"}
        aria-label={`Підвищити репутацію: ${authorName}`}
      >
        <Plus className="size-3" aria-hidden="true" />
      </button>

      <Dialog
        open={value !== null}
        onOpenChange={(open) => (open ? null : setValue(null))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {value === 1 ? "Підвищити" : "Знизити"} репутацію: {authorName}
            </DialogTitle>
            <DialogDescription>
              Вкажіть, за що ви {value === 1 ? "підвищуєте" : "знижуєте"}{" "}
              репутацію. Причину побачать усі в журналі репутації. Змінити
              репутацію за одне повідомлення можна лише раз.
            </DialogDescription>
          </DialogHeader>
          <label className="block space-y-1.5 text-sm">
            <span className="text-slate-300">Причина</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={REPUTATION_REASON_MAX}
              rows={4}
              autoFocus
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60"
              placeholder="Наприклад: детальна і перевірена відповідь"
            />
            <span className="block text-right text-xs text-slate-500">
              {reason.trim().length}/{REPUTATION_REASON_MAX}
            </span>
          </label>
          {error ? (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setValue(null)}
            >
              Скасувати
            </Button>
            <Button type="button" onClick={submit} disabled={pending}>
              {value === 1 ? "Підвищити" : "Знизити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={journalOpen} onOpenChange={showJournal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Журнал репутації: {authorName}</DialogTitle>
            <DialogDescription>
              Хто, коли, де і за що змінював репутацію учасника.
            </DialogDescription>
          </DialogHeader>
          {!journal ? (
            <p className="text-sm text-slate-400">Завантаження…</p>
          ) : !journal.ok ? (
            <p className="text-sm text-slate-400">
              {journal.error.code === "NOT_SIGNED_IN"
                ? "Увійдіть, щоб переглянути журнал репутації."
                : "Не вдалося завантажити журнал."}
            </p>
          ) : journal.data.items.length === 0 ? (
            <p className="text-sm text-slate-400">
              Репутацію цього учасника ще не змінювали.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-white/[0.06] overflow-y-auto">
              {journal.data.items.map((item) => {
                const place = reputationPlace(item.source ?? null);
                return (
                  <li
                    key={item.id}
                    className={`grid gap-1 py-2.5 text-sm ${
                      item.reversal ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className={`rounded px-1.5 text-xs font-semibold tabular-nums ${
                          item.value > 0
                            ? "bg-emerald-500/15 text-emerald-200"
                            : "bg-rose-500/15 text-rose-200"
                        }`}
                      >
                        {item.value > 0 ? "+1" : "−1"}
                      </span>
                      <Link
                        href={`/profile/${item.actor.username}`}
                        className="font-medium text-violet-300 hover:underline"
                      >
                        {forumMemberName(item.actor)}
                      </Link>
                      <time
                        dateTime={String(item.createdAt)}
                        className="text-xs text-slate-500"
                      >
                        {dateFormatter.format(new Date(String(item.createdAt)))}
                      </time>
                      <span className="text-xs text-slate-500">·</span>
                      {place.href ? (
                        <Link
                          href={place.href}
                          className="text-xs text-slate-300 hover:text-white hover:underline"
                        >
                          {place.label}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {place.label}
                        </span>
                      )}
                    </div>
                    <p
                      className={`break-words text-slate-200 ${
                        item.reversal ? "line-through" : ""
                      }`}
                    >
                      {item.reason}
                    </p>
                    {item.reversal ? (
                      <p className="text-xs text-slate-400">
                        Скасовано модератором: {item.reversal.reason}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </span>
  );
}
