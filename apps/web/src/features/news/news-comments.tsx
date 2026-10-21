"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  NewsCommentFieldsFragment,
  NewsCommentsQuery,
  NewsVoteKind,
} from "@/gql/graphql";

import {
  createNewsComment,
  loadMoreNewsComments,
  setNewsVote,
} from "./news-actions";
import { NewsPagination, type NewsPaginationMode } from "./news-pagination";

type CommentItem = NewsCommentFieldsFragment & { children: CommentItem[] };
type RawComment = NewsCommentFieldsFragment & { children?: RawComment[] };

function normalizeComment(comment: RawComment): CommentItem {
  return {
    ...comment,
    children: (comment.children ?? []).map(normalizeComment),
  };
}

function CommentComposer({
  interactionTargetId,
  articlePath,
  parentId,
  onDone,
}: {
  interactionTargetId: string;
  articlePath: string;
  parentId?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          try {
            await createNewsComment(
              interactionTargetId,
              body,
              articlePath,
              parentId,
            );
            setBody("");
            setError(undefined);
            onDone?.();
            router.refresh();
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Не вдалося надіслати коментар.",
            );
          }
        });
      }}
    >
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={parentId ? "Ваша відповідь…" : "Додайте коментар…"}
        maxLength={5000}
        aria-label={parentId ? "Відповідь" : "Новий коментар"}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !body.trim()}>
          {pending ? "Надсилаємо…" : parentId ? "Відповісти" : "Коментувати"}
        </Button>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      </div>
    </form>
  );
}

function CommentBranch({
  comment,
  interactionTargetId,
  articlePath,
  depth = 0,
}: {
  comment: CommentItem;
  interactionTargetId: string;
  articlePath: string;
  depth?: number;
}) {
  const [showReply, setShowReply] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [engagement, setEngagement] = useState(comment.engagement);
  const [pending, startTransition] = useTransition();
  const hidden = engagement.score <= -5 && !showHidden;
  const visibleChildren = showAll
    ? comment.children
    : comment.children.slice(0, 3);

  const vote = (kind: NewsVoteKind) => {
    startTransition(async () => {
      try {
        const next = await setNewsVote(
          comment.reactionTargetId,
          kind,
          articlePath,
        );
        if (next) {
          setEngagement({
            ...next,
            viewerReaction:
              next.viewerReaction === "UPVOTE" ||
              next.viewerReaction === "DOWNVOTE"
                ? next.viewerReaction
                : null,
          });
        }
      } catch {
        // The shared authentication error remains visible on the next interaction.
      }
    });
  };

  return (
    <article
      className="space-y-3 border-l border-white/10 pl-4"
      style={{ marginLeft: `${Math.min(depth, 5) * 0.5}rem` }}
    >
      <header className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link
          href={`/profile/${comment.author.username}`}
          className="font-medium text-slate-200 hover:text-cyan-300"
        >
          {comment.author.displayName ?? comment.author.username}
        </Link>
        <time dateTime={String(comment.createdAt)}>
          {new Date(String(comment.createdAt)).toLocaleString("uk-UA")}
        </time>
        {comment.editedAt ? <span>редаговано</span> : null}
      </header>
      {comment.isDeleted ? (
        <p className="italic text-slate-500">Коментар видалено.</p>
      ) : hidden ? (
        <button
          className="text-left text-sm text-slate-500 hover:text-slate-300"
          onClick={() => setShowHidden(true)}
        >
          Цей коментар має низьку оцінку й автоматично прихований. Показати
          його?
        </button>
      ) : (
        <p className="whitespace-pre-wrap leading-7 text-slate-200">
          {comment.body}
        </p>
      )}
      {!comment.isDeleted ? (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Позитивна оцінка"
            disabled={pending}
            onClick={() => vote("UPVOTE")}
          >
            <Plus className="size-4" />
          </Button>
          <span className="min-w-8 text-center text-sm font-semibold">
            {engagement.score}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Негативна оцінка"
            disabled={pending}
            onClick={() => vote("DOWNVOTE")}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowReply((value) => !value)}
          >
            Відповісти
          </Button>
        </div>
      ) : null}
      {showReply ? (
        <CommentComposer
          interactionTargetId={interactionTargetId}
          articlePath={articlePath}
          parentId={comment.id}
          onDone={() => setShowReply(false)}
        />
      ) : null}
      <div className="space-y-4">
        {visibleChildren.map((child) => (
          <CommentBranch
            key={child.id}
            comment={child}
            interactionTargetId={interactionTargetId}
            articlePath={articlePath}
            depth={depth + 1}
          />
        ))}
        {comment.children.length > 3 && !showAll ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowAll(true)}
          >
            Показати ще {comment.children.length - 3} відповідей
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function NewsComments({
  articleId,
  interactionTargetId,
  articlePath,
  initial,
  mode,
  threshold,
}: {
  articleId: string;
  interactionTargetId: string;
  articlePath: string;
  initial: NewsCommentsQuery["newsComments"];
  mode: NewsPaginationMode;
  threshold: number;
}) {
  const [pages, setPages] = useState([initial]);
  const [pending, startTransition] = useTransition();
  const current = pages.at(-1) ?? initial;
  const comments = pages.flatMap((page) =>
    (page.items as unknown as RawComment[]).map(normalizeComment),
  );
  const effectiveMode = initial.total >= threshold ? mode : "DISABLED";
  const load = (page: number, append: boolean) => {
    startTransition(async () => {
      const next = await loadMoreNewsComments(
        articleId,
        page,
        initial.pageSize,
      );
      setPages((value) =>
        append ? [...value.filter((item) => item.page !== page), next] : [next],
      );
    });
  };

  return (
    <section className="space-y-6 rounded-2xl border border-white/10 bg-slate-950/60 p-6 sm:p-8">
      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <MessageCircle className="size-6 text-cyan-300" /> Коментарі
        <span className="text-base text-slate-500">{initial.total}</span>
      </h2>
      <CommentComposer
        interactionTargetId={interactionTargetId}
        articlePath={articlePath}
      />
      <div className={`space-y-6 ${pending ? "opacity-60" : ""}`}>
        {comments.map((comment) => (
          <CommentBranch
            key={comment.id}
            comment={comment}
            interactionTargetId={interactionTargetId}
            articlePath={articlePath}
          />
        ))}
        {!comments.length ? (
          <p className="text-slate-500">
            Будьте першим, хто залишить коментар.
          </p>
        ) : null}
      </div>
      <NewsPagination
        mode={effectiveMode}
        totalPages={initial.totalPages}
        activePages={pages.map((page) => page.page)}
        canLoadMore={current.page < initial.totalPages}
        onPageChange={(page) => load(page, false)}
        onLoadMore={() => load(current.page + 1, true)}
        noun="коментарі"
      />
    </section>
  );
}
