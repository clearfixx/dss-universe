/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-section-list.tsx
 *
 * 🎯 Purpose:
 * One list of forum sections for the hub and the section page: each row
 * shows the section, its subforums, its own moderators, counters and the
 * latest reply (owner 2026-11-28, hierarchy after the 4pda example).
 *
 * ⚠️ Important:
 * Plain links and <details> only, so the list works without client
 * JavaScript.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { ForumAvatar } from "./forum-avatar";
import { forumCount, forumPlural, forumWhen } from "./forum-format";
import { ForumSectionIcon } from "./forum-section-icon";
import { sectionTotals } from "./forum-tree-model";

/** Subforum links shown before the «ще N» control. */
export const FORUM_SUBFORUM_LINKS = 6;

const TOPICS = ["тема", "теми", "тем"] as const;
const REPLIES = ["відповідь", "відповіді", "відповідей"] as const;
const COLUMNS =
  "@3xl:grid-cols-[minmax(0,1fr)_4rem_6rem_minmax(0,13rem)] @3xl:gap-x-4";

type Member = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

type Activity = {
  topicCount: number;
  replyCount: number;
  lastActivity?: {
    topicId: string;
    title: string;
    lastPostAt: unknown;
    lastPostNumber: number;
    author?: Member | null;
  } | null;
};

export type ForumListSection = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  showCounts: boolean;
  moderators: readonly Member[];
  activity: Activity;
  subforums?: ReadonlyArray<Omit<ForumListSection, "subforums">>;
};

export function ForumModeratorLine({
  members,
  label = "Модератори",
  className = "",
}: {
  members: readonly Member[];
  label?: string;
  className?: string;
}) {
  if (!members.length) return null;
  return (
    <p
      className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500 ${className}`}
    >
      <ShieldCheck className="size-3.5" aria-hidden="true" />
      <span>{label}:</span>
      {members.map((member, index) => (
        <span key={member.id}>
          <Link
            href={`/profile/${member.username}`}
            className="relative z-10 text-slate-300 hover:text-violet-200 hover:underline"
          >
            {member.displayName || member.username}
          </Link>
          {index < members.length - 1 ? "," : null}
        </span>
      ))}
    </p>
  );
}

function SubforumLink({ id, title }: { id: string; title: string }) {
  return (
    <Link
      href={`/community/forum/${id}`}
      className="inline-flex max-w-full truncate rounded-md border border-white/10 px-2 py-0.5 text-xs text-slate-200 hover:border-violet-400/50 hover:text-violet-200"
    >
      {title}
    </Link>
  );
}

function Subforums({
  items,
}: {
  items: NonNullable<ForumListSection["subforums"]>;
}) {
  if (!items.length) return null;
  const first = items.slice(0, FORUM_SUBFORUM_LINKS);
  const rest = items.slice(FORUM_SUBFORUM_LINKS);
  return (
    <>
      {/* Wide screens: the first links in view, the rest one click away. */}
      <div className="relative z-10 mt-2 hidden border-l-2 border-violet-500/40 pl-2.5 sm:block">
        <ul
          aria-label="Підфоруми"
          className="flex flex-wrap items-center gap-1.5"
        >
          <li aria-hidden="true" className="text-[11px] text-slate-500">
            Підфоруми:
          </li>
          {first.map((item) => (
            <li key={item.id} className="min-w-0">
              <SubforumLink {...item} />
            </li>
          ))}
        </ul>
        {rest.length ? (
          <details className="group/more mt-1.5">
            <summary className="cursor-pointer list-none text-xs text-violet-300 hover:underline">
              <span className="group-open/more:hidden">ще {rest.length}</span>
              <span className="hidden group-open/more:inline">згорнути</span>
            </summary>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {rest.map((item) => (
                <li key={item.id} className="min-w-0">
                  <SubforumLink {...item} />
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
      {/* Phones: all subforums stay folded under one button. */}
      <details className="relative z-10 mt-2 sm:hidden">
        <summary className="inline-flex min-h-9 cursor-pointer list-none items-center rounded-md border border-white/10 px-3 text-xs text-violet-200">
          Підфоруми ({items.length})
        </summary>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li key={item.id} className="min-w-0">
              <SubforumLink {...item} />
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}

function SectionRow({ section }: { section: ForumListSection }) {
  const subforums = section.subforums ?? [];
  const { counts, latest } = sectionTotals(section, subforums);
  return (
    <li
      className={`grid gap-y-2 border-b border-white/[0.06] px-4 py-3 last:border-b-0 hover:bg-white/[0.02] @3xl:items-center ${COLUMNS}`}
    >
      <div className="flex min-w-0 gap-3">
        <ForumSectionIcon slug={section.slug} className="size-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/community/forum/${section.id}`}
            className="font-semibold break-words text-white hover:text-violet-200"
          >
            {section.title}
          </Link>
          {section.description ? (
            <p className="line-clamp-2 text-xs text-slate-400">
              {section.description}
            </p>
          ) : null}
          <Subforums items={subforums} />
          <ForumModeratorLine members={section.moderators} className="mt-1.5" />
          {counts ? (
            <p className="mt-1.5 text-xs text-slate-400 @3xl:hidden">
              {forumCount(counts.topics)} {forumPlural(counts.topics, TOPICS)} ·{" "}
              {forumCount(counts.replies)}{" "}
              {forumPlural(counts.replies, REPLIES)}
            </p>
          ) : null}
        </div>
      </div>
      {(["topics", "replies"] as const).map((key) => (
        <span
          key={key}
          className="hidden text-right text-sm text-slate-200 @3xl:block"
        >
          <span className="sr-only">
            {key === "topics" ? "Тем: " : "Відповідей: "}
          </span>
          {counts ? forumCount(counts[key]) : "—"}
        </span>
      ))}
      {latest ? (
        <Link
          href={`/community/forum/topics/${latest.topicId}#post-${latest.lastPostNumber}`}
          className="flex min-w-0 items-center gap-2 pl-14 @3xl:pl-0"
        >
          <ForumAvatar
            member={latest.author ?? null}
            className="size-8 text-[11px]"
          />
          <span className="min-w-0">
            <span className="block truncate text-xs text-slate-200 hover:text-violet-200">
              {latest.title}
            </span>
            <span className="block truncate text-[11px] text-slate-500">
              {latest.author
                ? `${latest.author.displayName || latest.author.username} · `
                : null}
              {forumWhen(latest.lastPostAt as string)}
            </span>
          </span>
        </Link>
      ) : (
        <span className="pl-14 text-xs text-slate-500 @3xl:pl-0">
          Ще немає тем
        </span>
      )}
    </li>
  );
}

export function ForumSectionList({
  sections,
}: {
  sections: readonly ForumListSection[];
}) {
  return (
    // Columns follow the width of the list, not of the window.
    <div className="@container">
      <div
        aria-hidden="true"
        className={`hidden border-b border-white/[0.06] px-4 py-1.5 text-[11px] text-slate-500 @3xl:grid ${COLUMNS}`}
      >
        <span>Розділ</span>
        <span className="text-right">Тем</span>
        <span className="text-right">Відповідей</span>
        <span>Остання відповідь</span>
      </div>
      <ul>
        {sections.map((section) => (
          <SectionRow key={section.id} section={section} />
        ))}
      </ul>
    </div>
  );
}
