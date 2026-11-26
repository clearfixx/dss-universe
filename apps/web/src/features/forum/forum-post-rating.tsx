"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-post-rating.tsx
 *
 * 🎯 Purpose:
 * Post usefulness rating (owner 2026-11-26): two buttons «Добре (N)» and
 * «Погано (N)». It rates the post only and never changes the author's
 * reputation.
 *
 * ⚠️ Important:
 * Votes are final (D1); accounts younger than 7 days cannot vote (API).
 * «Хто голосував» opens the voters dialog.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ThumbsDown, ThumbsUp, Users } from "lucide-react";
import { useState, useTransition } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { getForumPostVoters, voteForumPost } from "./forum-actions";
import { forumMemberName } from "./forum-format";

type Voter = Awaited<ReturnType<typeof getForumPostVoters>>;

export function ForumPostRating({
  postId,
  ratingUp,
  ratingDown,
  viewerVote,
  canVote,
  disabledReason,
  path,
}: {
  postId: string;
  ratingUp: number;
  ratingDown: number;
  viewerVote: number | null;
  canVote: boolean;
  disabledReason?: string;
  path: string;
}) {
  const [rating, setRating] = useState({ ratingUp, ratingDown });
  const [vote, setVote] = useState(viewerVote);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [voters, setVoters] = useState<Voter | null>(null);

  const locked = !canVote || vote !== null || pending;
  const reason =
    vote !== null
      ? "Ваш голос уже враховано"
      : (disabledReason ?? "Голосувати");

  function cast(value: 1 | -1) {
    setError(null);
    start(async () => {
      const result = await voteForumPost(postId, value, path);
      if (result.ok) {
        setRating(result.data);
        setVote(value);
      } else setError(result.error.message);
    });
  }

  function showVoters(next: boolean) {
    setOpen(next);
    if (next && !voters) {
      void getForumPostVoters(postId).then(setVoters);
    }
  }

  const button = (active: boolean, tone: "good" | "bad") =>
    `inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm transition disabled:cursor-not-allowed ${
      active
        ? tone === "good"
          ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
          : "border-rose-400/40 bg-rose-500/15 text-rose-200"
        : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-violet-400/40 hover:text-white disabled:hover:border-white/10 disabled:hover:text-slate-300"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={button(vote === 1, "good")}
        onClick={() => cast(1)}
        disabled={locked}
        aria-pressed={vote === 1}
        title={reason}
      >
        <ThumbsUp className="size-4" aria-hidden="true" />
        Добре <span className="tabular-nums">({rating.ratingUp})</span>
      </button>
      <button
        type="button"
        className={button(vote === -1, "bad")}
        onClick={() => cast(-1)}
        disabled={locked}
        aria-pressed={vote === -1}
        title={reason}
      >
        <ThumbsDown className="size-4" aria-hidden="true" />
        Погано <span className="tabular-nums">({rating.ratingDown})</span>
      </button>
      {rating.ratingUp + rating.ratingDown > 0 ? (
        <button
          type="button"
          onClick={() => showVoters(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-slate-400 hover:bg-white/[0.05] hover:text-white"
        >
          <Users className="size-3.5" aria-hidden="true" />
          Хто голосував
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="w-full text-xs text-rose-300">
          {error}
        </p>
      ) : null}
      <Dialog open={open} onOpenChange={showVoters}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Голоси за допис</DialogTitle>
            <DialogDescription>
              «Добре»: {rating.ratingUp} · «Погано»: {rating.ratingDown}. Голос
              остаточний і не впливає на репутацію автора.
            </DialogDescription>
          </DialogHeader>
          {!voters ? (
            <p className="text-sm text-slate-400">Завантаження…</p>
          ) : !voters.ok || !voters.data ? (
            <p className="text-sm text-slate-400">
              Не вдалося завантажити голоси.
            </p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {voters.data.items.map((item) => (
                <li
                  key={`${item.voter?.id ?? "x"}-${item.createdAt}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span
                    className={item.reversed ? "line-through opacity-60" : ""}
                  >
                    {forumMemberName(item.voter)}
                  </span>
                  <span
                    className={
                      item.value > 0 ? "text-emerald-300" : "text-rose-300"
                    }
                  >
                    {item.value > 0 ? "Добре" : "Погано"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
