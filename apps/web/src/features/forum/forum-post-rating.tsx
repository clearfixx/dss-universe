"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-post-rating.tsx
 *
 * 🎯 Purpose:
 * The vertical rating column of a post: up, net score, down.
 *
 * ⚠️ Important:
 * Owner decisions: votes rate content only and are final; hovering the score
 * shows "80+ / 10−"; clicking it lists who voted.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, useTransition } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { getForumPostVoters, voteForumPost } from "./forum-actions";
import { forumMemberName, forumRatingBreakdown } from "./forum-format";

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

  const score = rating.ratingUp - rating.ratingDown;
  const arrow =
    "flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="flex w-12 flex-col items-center gap-0.5 py-1">
      <button
        type="button"
        className={`${arrow} ${vote === 1 ? "!text-violet-300 !opacity-100" : ""}`}
        onClick={() => cast(1)}
        disabled={locked}
        aria-label="Голосувати за"
        aria-pressed={vote === 1}
        title={reason}
      >
        <ChevronUp className="size-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => showVoters(true)}
        title={forumRatingBreakdown(rating)}
        aria-label={`Рейтинг ${score}: ${forumRatingBreakdown(rating)}. Показати, хто голосував`}
        className={`min-h-8 rounded-md px-1 text-base font-bold tabular-nums hover:bg-white/10 ${
          score < 0 ? "text-rose-300" : "text-white"
        }`}
      >
        {score}
      </button>
      <button
        type="button"
        className={`${arrow} ${vote === -1 ? "!text-rose-300 !opacity-100" : ""}`}
        onClick={() => cast(-1)}
        disabled={locked}
        aria-label="Голосувати проти"
        aria-pressed={vote === -1}
        title={reason}
      >
        <ChevronDown className="size-5" aria-hidden="true" />
      </button>
      {error ? (
        <p role="alert" className="sr-only">
          {error}
        </p>
      ) : null}
      <Dialog open={open} onOpenChange={showVoters}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Голоси за допис</DialogTitle>
            <DialogDescription>
              {rating.ratingUp} за · {rating.ratingDown} проти. Голос остаточний
              і змінює лише рейтинг допису.
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
                      item.value > 0 ? "text-violet-300" : "text-rose-300"
                    }
                  >
                    {item.value > 0 ? "+" : "−"}
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
