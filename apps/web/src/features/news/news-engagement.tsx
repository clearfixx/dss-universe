"use client";

import { Bookmark, LoaderCircle, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  FullNewsPageQuery,
  NewsRatingVotesQuery,
  NewsVoteKind,
} from "@/gql/graphql";
import { cn } from "@/lib/utils";

import {
  clearNewsVote,
  getNewsRatingVotes,
  setNewsBookmark,
  setNewsVote,
} from "./news-actions";

type Engagement = NonNullable<FullNewsPageQuery["fullNews"]>["engagement"];
type VotePage = NewsRatingVotesQuery["newsRatingVotes"];

const voteDateFormatter = new Intl.DateTimeFormat("uk-UA", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function NewsEngagement({
  articleId,
  interactionTargetId,
  articlePath,
  enabled,
  initial,
}: {
  articleId: string;
  interactionTargetId: string;
  articlePath: string;
  enabled: boolean;
  initial: Engagement;
}) {
  const [engagement, setEngagement] = useState(initial);
  const [votes, setVotes] = useState<VotePage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const vote = (kind: NewsVoteKind) => {
    startTransition(async () => {
      try {
        const summary =
          engagement.viewerReaction === kind
            ? await clearNewsVote(interactionTargetId, articlePath)
            : await setNewsVote(interactionTargetId, kind, articlePath);
        if (summary) {
          const viewerReaction =
            summary.viewerReaction === "UPVOTE" ||
            summary.viewerReaction === "DOWNVOTE"
              ? summary.viewerReaction
              : null;
          setEngagement((current) => ({
            ...current,
            ...summary,
            viewerReaction,
          }));
        }
        setMessage(null);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Не вдалося зберегти оцінку.",
        );
      }
    });
  };

  const bookmark = () => {
    startTransition(async () => {
      try {
        const saved = await setNewsBookmark(
          interactionTargetId,
          engagement.bookmarkedByViewer,
          articlePath,
        );
        if (typeof saved === "boolean") {
          setEngagement((current) => ({
            ...current,
            bookmarkedByViewer: saved,
          }));
        }
        setMessage(null);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Не вдалося змінити закладку.",
        );
      }
    });
  };

  const openVotes = () => {
    setDialogOpen(true);
    startTransition(async () => setVotes(await getNewsRatingVotes(articleId)));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {enabled ? (
          <>
            <Button
              variant="outline"
              size="icon"
              aria-label="Поставити плюс"
              aria-pressed={engagement.viewerReaction === "UPVOTE"}
              className={cn(
                engagement.viewerReaction === "UPVOTE" &&
                  "border-emerald-400 bg-emerald-400/15 text-emerald-300",
              )}
              disabled={pending}
              onClick={() => vote("UPVOTE")}
            >
              <Plus />
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={openVotes}
              aria-label="Відкрити статистику оцінок"
            >
              {pending ? <LoaderCircle className="animate-spin" /> : null}
              <strong
                className={
                  engagement.score < 0 ? "text-rose-300" : "text-emerald-300"
                }
              >
                {engagement.score}
              </strong>
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Поставити мінус"
              aria-pressed={engagement.viewerReaction === "DOWNVOTE"}
              className={cn(
                engagement.viewerReaction === "DOWNVOTE" &&
                  "border-rose-400 bg-rose-400/15 text-rose-300",
              )}
              disabled={pending}
              onClick={() => vote("DOWNVOTE")}
            >
              <Minus />
            </Button>
          </>
        ) : null}
        <Button
          variant="outline"
          disabled={pending}
          onClick={bookmark}
          aria-pressed={engagement.bookmarkedByViewer}
        >
          <Bookmark
            className={cn(
              engagement.bookmarkedByViewer && "fill-cyan-300 text-cyan-300",
            )}
          />
          {engagement.bookmarkedByViewer ? "У закладках" : "До закладок"}
        </Button>
      </div>
      {message ? (
        <p role="alert" className="text-sm text-amber-300">
          {message}
        </p>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[75vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Статистика оцінок</DialogTitle>
            <DialogDescription>
              {votes
                ? `${votes.total} голосів: +${engagement.upvotes} / −${engagement.downvotes}`
                : "Завантаження…"}
            </DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-white/10">
            {votes?.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full font-bold",
                    item.kind === "UPVOTE"
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-rose-400/15 text-rose-300",
                  )}
                >
                  {item.kind === "UPVOTE" ? "+" : "−"}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${item.actor.username}`}
                    className="font-medium hover:text-cyan-300"
                  >
                    {item.actor.displayName ?? item.actor.username}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {voteDateFormatter.format(new Date(String(item.updatedAt)))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
