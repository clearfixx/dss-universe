/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-post-card.tsx
 *
 * 🎯 Purpose:
 * One forum post in the owner-approved layout: author column, header with
 * date and permalink, body, moderator note, attachments, actions and the
 * rating column.
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
import { ForumPostStaff } from "./forum-post-staff";
import { ForumPostActions } from "./forum-topic-controls";

const dateFormatter = new Intl.DateTimeFormat("uk-UA", {
  dateStyle: "medium",
  timeStyle: "short",
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

  return (
    <article
      id={`post-${post.number}`}
      aria-label={`Допис #${post.number}, ${name}`}
      className={`grid scroll-mt-24 gap-0 overflow-hidden rounded-2xl border bg-[#0f1328] sm:grid-cols-[13rem_minmax(0,1fr)] ${
        accepted
          ? "border-emerald-500/60 shadow-[0_0_0_1px_rgba(16,185,129,.25)]"
          : "border-white/10"
      }`}
    >
      <aside className="flex items-center gap-3 border-b border-white/10 bg-white/[0.02] p-4 sm:flex-col sm:items-start sm:border-b-0 sm:border-r">
        {post.author?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.author.avatarUrl}
            alt=""
            className="size-16 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 text-lg font-bold"
          >
            <Initials name={name} />
          </span>
        )}
        <div className="min-w-0 space-y-1.5">
          {post.author ? (
            <Link
              href={`/profile/${post.author.username}`}
              className="block truncate font-semibold text-white hover:text-violet-300"
            >
              {name}
            </Link>
          ) : (
            <span className="font-semibold text-slate-400">{name}</span>
          )}
          {post.author ? (
            <span className="block truncate text-xs text-slate-500">
              @{post.author.username}
            </span>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-md bg-violet-500/20 px-2 py-0.5 text-[11px] font-medium text-violet-200"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 gap-4 p-4 sm:p-5">
        <div className="min-w-0 flex-1 space-y-4">
          <header className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <time dateTime={String(post.createdAt)}>
              {dateFormatter.format(new Date(String(post.createdAt)))}
            </time>
            {post.editedAt ? <span>(змінено)</span> : null}
            {accepted ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-300">
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
            <a
              href={`#post-${post.number}`}
              className="ml-auto font-medium text-slate-300 hover:text-white"
            >
              #{post.number}
            </a>
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
              {canEditForumPost({
                viewerId,
                moderator: abilities.moderate,
                topicState,
                curatorId,
                post: {
                  number: post.number,
                  authorId: post.author?.id ?? null,
                  createdAt: String(post.createdAt),
                },
              }) ? (
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
              className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
                post.state === "HIDDEN"
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-100"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-100"
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
                    <summary className="cursor-pointer text-violet-300">
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
              className="flex gap-3 rounded-xl border border-violet-500/40 bg-violet-500/10 p-4"
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

          <ForumPostStaff
            topicId={topicId}
            post={post}
            abilities={abilities}
            isAccepted={accepted}
            path={path}
          />

          {visible ? (
            <ForumPostActions
              number={post.number}
              permalink={`${path}#post-${post.number}`}
              canReply={canReply}
            />
          ) : null}
        </div>

        {visible ? (
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
        ) : null}
      </div>
    </article>
  );
}
