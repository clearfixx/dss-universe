/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-topic-row.tsx
 *
 * 🎯 Purpose:
 * One topic row of the forum lists (section page, followed topics):
 * unread dot, status icon, title, type, tags, counters and last activity.
 *
 * ⚠️ Important:
 * Server component; the whole row is a link to the topic.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Archive,
  CheckCircle2,
  Eye,
  HelpCircle,
  Lock,
  MessageSquare,
  Pin,
} from "lucide-react";
import Link from "next/link";

import { ForumAvatar } from "@/features/forum/forum-avatar";
import {
  forumAgo,
  forumCount,
  forumMemberName,
  forumPlural,
  forumUnreadCount,
} from "@/features/forum/forum-format";
import type { ForumTopicSummaryFragment } from "@/gql/graphql";

type Topic = ForumTopicSummaryFragment;

const REPLIES = ["відповідь", "відповіді", "відповідей"] as const;

function StatusIcon({ topic }: { topic: Topic }) {
  if (topic.pinned)
    return <Pin className="size-5 text-violet-300" aria-label="Закріплено" />;
  if (topic.acceptedAnswerPostId)
    return (
      <CheckCircle2
        className="size-5 text-emerald-400"
        aria-label="Є прийнята відповідь"
      />
    );
  if (topic.state === "ARCHIVED")
    return <Archive className="size-5 text-slate-400" aria-label="В архіві" />;
  if (topic.state !== "OPEN")
    return <Lock className="size-5 text-amber-300" aria-label="Закрита" />;
  if (topic.kind === "QUESTION")
    return (
      <HelpCircle className="size-5 text-slate-400" aria-label="Питання" />
    );
  return (
    <MessageSquare className="size-5 text-slate-400" aria-label="Обговорення" />
  );
}

export function ForumTopicRow({ topic }: { topic: Topic }) {
  const unread = forumUnreadCount(topic);
  const replies = Math.max(0, topic.postCount - 1);
  const last = topic.lastPostAuthor ?? topic.author;
  return (
    <li className="relative grid grid-cols-[0.5rem_1.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 border-b border-white/[0.06] px-3 py-2.5 last:border-b-0 hover:bg-white/[0.02] md:grid-cols-[0.5rem_1.5rem_minmax(0,1fr)_3.5rem_3.5rem_9.5rem] xl:grid-cols-[0.5rem_1.5rem_minmax(0,1fr)_minmax(0,10rem)_3rem_3rem_9rem]">
      <span
        className={`size-2 rounded-full ${unread ? "bg-violet-400" : ""}`}
        aria-label={unread ? `${unread} непрочитаних` : undefined}
      />
      <StatusIcon topic={topic} />
      <div className="min-w-0">
        <Link
          href={`/community/forum/topics/${topic.id}`}
          className={`block truncate after:absolute after:inset-0 hover:text-violet-200 ${
            unread ? "font-semibold text-white" : "text-slate-100"
          }`}
        >
          {topic.title}
        </Link>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
          <span className="rounded bg-white/[0.06] px-1.5 py-px text-slate-300">
            {topic.kind === "QUESTION" ? "Питання" : "Обговорення"}
          </span>
          <span className="md:hidden">
            {replies} {forumPlural(replies, REPLIES)} ·{" "}
            {forumAgo(topic.lastPostAt)}
          </span>
        </span>
      </div>
      <ul className="hidden min-w-0 flex-wrap gap-1 xl:flex">
        {topic.tags.slice(0, 3).map((tag) => (
          <li
            key={tag.id}
            className="truncate rounded bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-slate-300"
          >
            {tag.label}
          </li>
        ))}
        {topic.tags.length > 3 ? (
          <li className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-slate-400">
            +{topic.tags.length - 3}
          </li>
        ) : null}
      </ul>
      <span
        className="hidden items-center gap-1 text-sm text-slate-300 md:flex"
        title="Відповіді"
      >
        <MessageSquare className="size-4 text-slate-400" aria-hidden="true" />
        {forumCount(replies)}
        <span className="sr-only">відповідей</span>
      </span>
      <span
        className="hidden items-center gap-1 text-sm text-slate-400 md:flex"
        title="Перегляди"
      >
        <Eye className="size-4" aria-hidden="true" />
        {forumCount(topic.viewCount)}
        <span className="sr-only">переглядів</span>
      </span>
      <span className="hidden min-w-0 items-center gap-2 md:flex">
        <ForumAvatar member={last} className="size-8 text-[11px]" />
        <span className="min-w-0 text-xs">
          <span className="block truncate text-slate-200">
            {forumMemberName(last)}
          </span>
          <span className="block truncate text-slate-500">
            {forumAgo(topic.lastPostAt)}
          </span>
        </span>
      </span>
    </li>
  );
}
