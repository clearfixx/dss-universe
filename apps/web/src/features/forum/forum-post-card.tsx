/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-post-card.tsx
 *
 * 🎯 Purpose:
 * One forum post in the owner-approved layout: author column, header with
 * #N and date, body, moderator note, attachments, the action bar, and the
 * rating column on the right (owner decision 2026-11-21).
 *
 * ⚠️ Important:
 * Hidden, deleted and purged posts arrive without content for ordinary
 * viewers; staff additionally receive the moderation reason.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  CheckCircle2,
  EyeOff,
  Paperclip,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import type { ForumPostFieldsFragment } from "@/gql/graphql";

import { ForumDocument } from "./forum-document";
import { canEditForumPost, forumMemberName } from "./forum-format";
import { ForumPostEditor } from "./forum-post-editor";
import { ForumPostRating } from "./forum-post-rating";
import { ForumPostActionBar } from "./forum-post-action-bar";
import { ForumPostEditScope } from "./forum-post-edit-scope";

const dateFormatter = new Intl.DateTimeFormat("uk-UA", {
  dateStyle: "medium",
  timeStyle: "short",
});

const numberFormatter = new Intl.NumberFormat("uk-UA");
const joinedFormatter = new Intl.DateTimeFormat("uk-UA", {
  month: "short",
  year: "numeric",
});

const TOMBSTONE: Record<string, string> = {
  HIDDEN: "Допис приховано модератором.",
  DELETED: "Допис видалено модератором.",
  PURGED: "Допис остаточно видалено адміністратором.",
};

const ROLE: Record<string, string> = {
  CURATOR: "Куратор",
  MODERATOR: "Модератор",
  SUPERMODERATOR: "Супермодератор",
  ADMINISTRATOR: "Адміністратор",
};

function Initials({ name }: { name: string }) {
  const letters = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return <>{letters || "?"}</>;
}

export function ForumPostCard({
  post,
  topicAuthorId,
  curatorId,
  accepted,
  viewerId,
  canReply,
  path,
  topicId,
  abilities,
  topicState,
  topicTitle,
}: {
  topicState: string;
  topicTitle: string;
  topicId: string;
  abilities: Readonly<{
    moderate: boolean;
    purge: boolean;
    acceptAnswer: boolean;
  }>;
  post: ForumPostFieldsFragment;
  topicAuthorId: string;
  curatorId: string | null;
  accepted: boolean;
  viewerId: string | null;
  canReply: boolean;
  path: string;
}) {
  const name = forumMemberName(post.author);
  const own = viewerId !== null && post.author?.id === viewerId;
  const visible = post.state === "VISIBLE";
  const badges = [
    post.author?.id === topicAuthorId ? "Автор теми" : null,
    post.author?.id === curatorId ? "Куратор теми" : null,
  ].filter(Boolean) as string[];
  const rating = (
    <ForumPostRating
      postId={post.id}
      ratingUp={post.ratingUp}
      ratingDown={post.ratingDown}
      viewerVote={post.viewerVote ?? null}
      canVote={viewerId !== null && !own}
      disabledReason={
        viewerId === null
          ? "Увійдіть, щоб голосувати"
          : own
            ? "Свої дописи оцінювати не можна"
            : undefined
      }
      path={path}
    />
  );
  const ratingRow = (
    <ForumPostRating
      postId={post.id}
      ratingUp={post.ratingUp}
      ratingDown={post.ratingDown}
      viewerVote={post.viewerVote ?? null}
      canVote={viewerId !== null && !own}
      disabledReason={
        viewerId === null
          ? "Увійдіть, щоб голосувати"
          : own
            ? "Свої дописи оцінювати не можна"
            : undefined
      }
      path={path}
      horizontal
    />
  );

  const canEdit =
    visible &&
    Boolean(post.documentJson) &&
    canEditForumPost({
      viewerId,
      moderator: abilities.moderate,
      topicState,
      curatorId,
      post: {
        number: post.number,
        authorId: post.author?.id ?? null,
        createdAt: String(post.createdAt),
      },
    });

  return (
    <article
      id={`post-${post.number}`}
      aria-label={`Допис #${post.number}, ${name}`}
      className={`grid scroll-mt-24 overflow-hidden rounded-xl sm:grid-cols-[10rem_minmax(0,1fr)_3.5rem] ${
        accepted
          ? "bg-emerald-950/30 ring-1 ring-emerald-500/50"
          : visible
            ? "bg-card"
            : "bg-card/70"
      }`}
    >
      <aside className="flex items-start gap-3 p-3 sm:block sm:space-y-2 sm:border-r sm:border-white/[0.06] sm:p-4">
        <div className="flex items-center gap-2.5 sm:items-start">
          {post.author?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.author.avatarUrl}
              alt=""
              className="size-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/25 text-violet-100 text-sm font-bold"
            >
              <Initials name={name} />
            </span>
          )}
          <div className="min-w-0">
            {post.author ? (
              <Link
                href={`/profile/${post.author.username}`}
                className="block truncate text-sm font-semibold text-white hover:text-violet-300"
              >
                {name}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-slate-400">
                {name}
              </span>
            )}
            {post.author ? (
              <span className="block truncate text-xs text-slate-500">
                @{post.author.username}
              </span>
            ) : null}
          </div>
        </div>
        {badges.length || post.author ? (
          <div className="flex flex-wrap gap-1.5 sm:pl-[3.125rem]">
            {post.author ? (
              <span
                title="Рівень учасника"
                className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-200"
              >
                Рів. {post.author.stats.level}
              </span>
            ) : null}
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[11px] font-medium text-violet-200"
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}
        {post.author ? (
          <dl className="hidden grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs text-slate-400 sm:grid">
            <dt>Дописи:</dt>
            <dd className="text-slate-200 tabular-nums">
              {numberFormatter.format(post.author.stats.postCount)}
            </dd>
            <dt>Репутація:</dt>
            <dd
              className={`tabular-nums ${
                post.author.stats.reputation < 0
                  ? "text-rose-300"
                  : "text-slate-200"
              }`}
            >
              {numberFormatter.format(post.author.stats.reputation)}
            </dd>
            <dt className="col-span-2 pt-0.5">
              На сайті з{" "}
              <span className="text-slate-200">
                {joinedFormatter
                  .format(new Date(String(post.author.joinedAt)))
                  .replace(/s*р.$/, "")}
              </span>
            </dt>
          </dl>
        ) : null}
      </aside>

      <ForumPostEditScope canEdit={canEdit}>
        <div className="min-w-0 space-y-3 px-3 pb-3 sm:px-4 sm:pt-3.5">
          <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            <a
              href={`#post-${post.number}`}
              className="font-medium text-slate-300 hover:text-white"
            >
              #{post.number}
            </a>
            <span aria-hidden="true">·</span>
            <time dateTime={String(post.createdAt)}>
              {dateFormatter.format(new Date(String(post.createdAt)))}
            </time>
            {post.editedAt ? <span>(відредаговано)</span> : null}
            {accepted ? (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-300">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                Прийнята відповідь
              </span>
            ) : null}
            {post.replyToNumber ? (
              <a
                href={`#post-${post.replyToNumber}`}
                className="text-violet-300 hover:underline"
              >
                у відповідь на #{post.replyToNumber}
              </a>
            ) : null}
          </header>

          {visible && post.documentJson ? (
            <>
              {post.quotedNumbers.length ? (
                <p className="text-xs text-slate-500">
                  Цитує{" "}
                  {post.quotedNumbers.map((number) => (
                    <a
                      key={number}
                      href={`#post-${number}`}
                      className="mr-1 text-violet-300 hover:underline"
                    >
                      #{number}
                    </a>
                  ))}
                </p>
              ) : null}
              {canEdit ? (
                <ForumPostEditor
                  post={{ ...post, documentJson: post.documentJson }}
                  topicTitle={topicTitle}
                  path={path}
                >
                  <ForumDocument documentJson={post.documentJson} />
                </ForumPostEditor>
              ) : (
                <ForumDocument documentJson={post.documentJson} />
              )}
            </>
          ) : (
            <div
              className={`flex items-start gap-3 rounded-lg p-3 text-sm ${
                post.state === "HIDDEN"
                  ? "bg-violet-500/10 text-violet-100 ring-1 ring-violet-500/30"
                  : "bg-rose-500/10 text-rose-100 ring-1 ring-rose-500/30"
              }`}
            >
              {post.state === "HIDDEN" ? (
                <EyeOff className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              ) : (
                <Trash2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold">
                  {TOMBSTONE[post.state] ?? "Допис недоступний."}
                </p>
                {post.moderation ? (
                  <p className="text-slate-300">
                    Причина: {post.moderation.reason} ·{" "}
                    {dateFormatter.format(new Date(String(post.moderation.at)))}
                  </p>
                ) : null}
                {post.documentJson && abilities.moderate ? (
                  <details className="pt-2 text-slate-200">
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md bg-white/[0.06] px-2.5 py-1 text-xs text-slate-200 hover:bg-white/10">
                      Показати зміст
                    </summary>
                    <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/60 p-3">
                      <ForumDocument documentJson={post.documentJson} />
                    </div>
                  </details>
                ) : null}
              </div>
            </div>
          )}

          {post.staffNotes.map((note) => (
            <aside
              key={note.id}
              className="flex gap-3 rounded-lg bg-violet-500/10 p-3 ring-1 ring-violet-500/25"
            >
              <ShieldCheck
                className="mt-0.5 size-5 shrink-0 text-violet-300"
                aria-hidden="true"
              />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-violet-100">
                  Мітка: {ROLE[note.role] ?? "Модератор"}
                </p>
                <p className="whitespace-pre-line text-slate-200">
                  {note.body}
                </p>
              </div>
            </aside>
          ))}

          {post.attachments.length ? (
            <ul className="flex flex-wrap gap-2">
              {post.attachments.map((file) => (
                <li key={file.mediaId}>
                  <a
                    href={file.downloadUrl}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-slate-200 hover:border-violet-400/40"
                  >
                    <Paperclip className="size-4" aria-hidden="true" />
                    {file.filename}
                    <span className="text-xs text-slate-500">
                      {Math.max(1, Math.round(file.size / 1024))} КБ
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <ForumPostActionBar
            topicId={topicId}
            post={post}
            abilities={abilities}
            isAccepted={accepted}
            path={path}
            canReply={canReply}
          />
        </div>
      </ForumPostEditScope>

      <div className="hidden justify-center pt-3 sm:flex">
        {visible ? rating : null}
      </div>
      {visible ? <div className="px-3 pb-3 sm:hidden">{ratingRow}</div> : null}
    </article>
  );
}
