/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/app/community/(hub)/page.tsx
 *
 * 🎯 Purpose:
 * Community Hub home after the owner mockup "Центр спільноти": hero with
 * counters, latest activity, questions that need help, the section tree (one
 * foldable block per category, owner 2026-11-28) and, aside, followed topics, unanswered topics and tags.
 *
 * ⚠️ Important:
 * Every block honours forum visibility (decided by the API). Mockup blocks
 * without an API yet (missions, weekly top members, events, personal
 * recommendations) are left out rather than faked.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BellRing,
  ChevronRight,
  HelpCircle,
  Layers,
  ListChecks,
  MessageSquare,
  MessageSquareDashed,
  Plus,
  ShieldCheck,
  UserPlus,
  Users,
  Trophy,
  Target,
  CalendarDays,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { loadSessionViewer } from "@/features/auth/session-data";
import { ForumAvatar } from "@/features/forum/forum-avatar";
import {
  loadForumCategories,
  loadForumHub,
  loadForumModerationOverview,
  loadForumWeeklyTop,
  loadViewerForumTopics,
} from "@/features/forum/forum-data";
import {
  forumAgo,
  forumCount,
  forumPlural,
  forumUnreadCount,
} from "@/features/forum/forum-format";
import {
  ForumModeratorLine,
  ForumSectionList,
} from "@/features/forum/forum-section-list";

export const metadata: Metadata = {
  title: "Community Hub | DSS Universe",
  description: "Питання, обговорення та досвід спільноти DSS Universe.",
};

type Props = { searchParams: Promise<{ category?: string }> };

type Member = {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
} | null;

type TopicRow = {
  id: string;
  title: string;
  lastPostAt: unknown;
  createdAt: unknown;
  postCount: number;
  lastPostNumber: number;
  viewerLastReadNumber?: number | null;
  tags: ReadonlyArray<{ id: string; label: string }>;
  author?: Member;
  lastPostAuthor?: Member;
};

const MISSION_METRIC: Record<string, string> = {
  TOPICS: "Нові теми",
  REPLIES: "Відповіді",
  ACCEPTED_ANSWERS: "Прийняті відповіді",
  REPUTATION: "Репутація",
};
const DAY_MONTH = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "long",
});
const MONTH = new Intl.DateTimeFormat("uk-UA", { month: "short" });
const EVENT_TIME = new Intl.DateTimeFormat("uk-UA", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const REPLIES = ["відповідь", "відповіді", "відповідей"] as const;

function Panel({
  title,
  icon,
  children,
  more,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  more?: { href: string; label: string };
}) {
  return (
    <section className="min-w-0 rounded-xl border border-white/[0.07] bg-card">
      <header className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        {icon}
        <h2 className="flex-1 font-semibold">{title}</h2>
        {more ? (
          <Link
            href={more.href}
            className="text-xs text-violet-300 hover:text-violet-200"
          >
            {more.label} →
          </Link>
        ) : null}
      </header>
      <div className="px-2 pb-2">{children}</div>
    </section>
  );
}

function TopicLines({
  topics,
  empty,
  who,
  when,
  stacked = false,
}: {
  topics: readonly TopicRow[];
  empty: string;
  stacked?: boolean;
  who: (topic: TopicRow) => Member | undefined;
  when: (topic: TopicRow) => unknown;
}) {
  if (topics.length === 0)
    return <p className="px-2 py-3 text-sm text-slate-400">{empty}</p>;
  return (
    <ul>
      {topics.map((topic) => {
        const unread = forumUnreadCount(topic);
        const replies = Math.max(0, topic.postCount - 1);
        if (stacked) {
          return (
            <li key={topic.id}>
              <Link
                href={`/community/forum/topics/${topic.id}`}
                className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]"
              >
                <ForumAvatar
                  member={who(topic)}
                  className="size-8 text-[11px]"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm ${
                      unread ? "font-semibold text-white" : "text-slate-100"
                    }`}
                  >
                    {topic.title}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {topic.tags[0] ? `#${topic.tags[0].label} · ` : ""}
                    {replies} {forumPlural(replies, REPLIES)} ·{" "}
                    {forumAgo(when(topic))}
                  </span>
                </span>
              </Link>
            </li>
          );
        }
        return (
          <li key={topic.id}>
            <Link
              href={`/community/forum/topics/${topic.id}`}
              className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/[0.04]"
            >
              <span
                className={`size-1.5 shrink-0 rounded-full ${
                  unread ? "bg-violet-400" : "bg-white/15"
                }`}
                aria-label={unread ? `${unread} непрочитаних` : undefined}
              />
              <ForumAvatar member={who(topic)} className="size-7 text-[10px]" />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-100">
                {topic.title}
              </span>
              {topic.tags[0] ? (
                <span className="hidden shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-slate-300 sm:inline">
                  {topic.tags[0].label}
                </span>
              ) : null}
              <span
                className="flex w-10 shrink-0 items-center justify-end gap-1 text-xs text-slate-400"
                title="Відповіді"
              >
                <MessageSquare className="size-3.5" aria-hidden="true" />
                {replies}
              </span>
              <span className="hidden w-24 shrink-0 text-right text-xs text-slate-500 sm:block">
                {forumAgo(when(topic))}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function CommunityHubRoute({ searchParams }: Props) {
  const { category: categoryId } = await searchParams;
  const viewer = await loadSessionViewer();
  const [hub, categories, subscribed, sections, weeklyTop, moderation] =
    await Promise.all([
      loadForumHub(),
      loadForumCategories(),
      viewer ? loadViewerForumTopics("SUBSCRIBED", 1) : null,
      viewer ? loadViewerForumTopics("FOLLOWED_SECTIONS", 1) : null,
      viewer ? loadForumWeeklyTop(5) : null,
      viewer ? loadForumModerationOverview() : null,
    ]);
  const topScorers = (weeklyTop ?? []).filter(
    (entry) => entry.communityPoints > 0,
  );
  const followed =
    subscribed || sections
      ? [
          ...new Map(
            [...(subscribed?.items ?? []), ...(sections?.items ?? [])].map(
              (topic) => [topic.id, topic],
            ),
          ).values(),
        ]
          .sort(
            (a, b) =>
              new Date(String(b.lastPostAt)).getTime() -
              new Date(String(a.lastPostAt)).getTime(),
          )
          .slice(0, 4)
      : null;
  const stats = hub.forumHubStats;
  const current = categories.find((item) => item.id === categoryId) ?? null;
  const createHref = viewer
    ? "/community/forum/new"
    : "/login?returnTo=/community/forum/new";

  const counters: ReadonlyArray<[string, number, typeof Users]> = [
    ["Учасників", stats.participantCount, Users],
    ["Дописів", stats.postCount, MessageSquare],
    ["Тем", stats.topicCount, ListChecks],
    ["Розділи", stats.forumCount, Layers],
  ];
  const chip = (active: boolean) =>
    `inline-flex h-9 shrink-0 items-center rounded-lg px-3 text-sm transition ${
      active
        ? "bg-violet-600 font-semibold text-white"
        : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
    }`;

  return (
    <DssApplicationShell
      pageTitle={{ pathname: "/community", title: "Community Hub" }}
      breadcrumbs={[{ label: "Спільнота" }]}
    >
      <div className="space-y-5">
        <section className="py-1">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200">
                  <Users className="size-7" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Community Hub
                  </h1>
                  <p className="mt-1 text-sm text-slate-300 sm:text-base">
                    Обговорення, знання, досвід і спільні проєкти. Будуємо краще
                    ПЗ разом.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                <dl className="grid w-full grid-cols-2 rounded-xl border border-white/[0.08] bg-card sm:w-auto sm:grid-cols-4">
                  {counters.map(([label, value, Icon]) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 border-white/[0.07] px-4 py-2.5 sm:border-l sm:first:border-l-0"
                    >
                      <Icon
                        className="size-5 text-violet-300"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col-reverse">
                        <dt className="text-xs text-slate-400">{label}</dt>
                        <dd className="text-base leading-tight font-bold">
                          {forumCount(value)}
                        </dd>
                      </div>
                    </div>
                  ))}
                </dl>
                <p className="hidden text-lg font-semibold text-violet-200/90 xl:block">
                  Build. Inspire. Grow.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 lg:w-52 lg:flex-col">
              <Link
                href={createHref}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500"
              >
                <Plus className="size-4" aria-hidden="true" />
                Створити тему
              </Link>
              {moderation && moderation !== "DENIED" ? (
                <Link
                  href="/community/moderation"
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-violet-400/40 px-4 text-sm font-semibold text-violet-100 hover:border-violet-300"
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Модерація
                  {moderation.trashCount ? (
                    <span className="rounded bg-rose-500/20 px-1.5 text-xs text-rose-200">
                      кошик {moderation.trashCount}
                    </span>
                  ) : null}
                </Link>
              ) : null}
              {viewer ? null : (
                <Link
                  href="/register"
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-semibold text-white hover:border-violet-400"
                >
                  <UserPlus className="size-4" aria-hidden="true" />
                  Приєднатись
                </Link>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <Panel
                title="Останні активності"
                icon={
                  <Zap className="size-5 text-violet-300" aria-hidden="true" />
                }
              >
                <TopicLines
                  topics={hub.latest.items}
                  empty="Активності поки немає."
                  who={(topic) => topic.lastPostAuthor ?? topic.author}
                  when={(topic) => topic.lastPostAt}
                />
              </Panel>
              <Panel
                title="Потрібна допомога"
                icon={
                  <HelpCircle
                    className="size-5 text-amber-300"
                    aria-hidden="true"
                  />
                }
              >
                <TopicLines
                  topics={hub.help.items}
                  empty="Усі питання мають прийняту відповідь."
                  who={(topic) => topic.author}
                  when={(topic) => topic.createdAt}
                  stacked
                />
                {hub.help.total > hub.help.items.length ? (
                  <p className="px-2 pt-1 text-xs text-slate-500">
                    Ще {hub.help.total - hub.help.items.length}{" "}
                    {forumPlural(hub.help.total - hub.help.items.length, [
                      "питання чекає",
                      "питання чекають",
                      "питань чекають",
                    ])}{" "}
                    на відповідь.
                  </p>
                ) : null}
              </Panel>
            </div>

            <section aria-label="Розділи форуму" className="space-y-3">
              {categories.length > 1 ? (
                <nav
                  aria-label="Категорії"
                  className="flex gap-2 overflow-x-auto pb-1"
                >
                  <Link
                    href="/community"
                    aria-current={current ? undefined : "page"}
                    className={chip(!current)}
                  >
                    Усі категорії
                  </Link>
                  {categories.map((item) => (
                    <Link
                      key={item.id}
                      href={`/community?category=${item.id}`}
                      aria-current={
                        current?.id === item.id ? "page" : undefined
                      }
                      className={chip(current?.id === item.id)}
                    >
                      {item.title}
                    </Link>
                  ))}
                </nav>
              ) : null}
              {categories.length === 0 ? (
                <p className="rounded-xl border border-white/[0.07] bg-card p-6 text-center text-sm text-slate-400">
                  Розділів поки немає.
                </p>
              ) : (
                (current ? [current] : categories).map((category) => (
                  <details
                    key={category.id}
                    open
                    className="group/category overflow-hidden rounded-xl border border-white/[0.07] bg-card"
                  >
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 border-b border-violet-500/30 bg-violet-500/10 px-4 py-3">
                      <ChevronRight
                        className="size-4 text-violet-300 transition group-open/category:rotate-90"
                        aria-hidden="true"
                      />
                      <h2 className="font-semibold text-white">
                        {category.title}
                      </h2>
                      <span className="text-xs text-slate-400">категорія</span>
                      <ForumModeratorLine
                        members={category.moderators}
                        label="Модератори категорії"
                        className="w-full sm:ml-auto sm:w-auto"
                      />
                    </summary>
                    {category.forums.length ? (
                      <ForumSectionList sections={category.forums} />
                    ) : (
                      <p className="p-4 text-sm text-slate-400">
                        У цій категорії ще немає розділів.
                      </p>
                    )}
                  </details>
                ))
              )}
            </section>
            <div className="grid gap-4 lg:grid-cols-2">
              {followed ? (
                <Panel
                  title="Нове у підписках"
                  more={{ href: "/community/following", label: "Усі" }}
                  icon={
                    <BellRing
                      className="size-5 text-violet-300"
                      aria-hidden="true"
                    />
                  }
                >
                  <TopicLines
                    topics={followed}
                    stacked
                    empty="Стежте за темами — нові відповіді з’являться тут."
                    who={(topic) => topic.lastPostAuthor ?? topic.author}
                    when={(topic) => topic.lastPostAt}
                  />
                </Panel>
              ) : null}
              <Panel
                title="Ще без відповідей"
                icon={
                  <MessageSquareDashed
                    className="size-5 text-violet-300"
                    aria-hidden="true"
                  />
                }
              >
                <TopicLines
                  topics={hub.quiet.items}
                  empty="Усі теми вже отримали відповіді."
                  who={(topic) => topic.author}
                  when={(topic) => topic.createdAt}
                  stacked
                />
              </Panel>
            </div>
          </div>

          <aside className="min-w-0 space-y-4">
            {hub.communityMissions.length ? (
              <Panel
                title="Місії спільноти"
                icon={
                  <Target
                    className="size-5 text-violet-300"
                    aria-hidden="true"
                  />
                }
              >
                <ul className="space-y-2 px-2 pb-1">
                  {hub.communityMissions.map((mission) => {
                    const progress = mission.viewerProgress;
                    const percent =
                      progress == null
                        ? 0
                        : Math.min(100, (progress / mission.target) * 100);
                    return (
                      <li
                        key={mission.id}
                        className="rounded-lg bg-white/[0.03] p-3"
                      >
                        <p className="text-sm font-semibold">{mission.title}</p>
                        {mission.description ? (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {mission.description}
                          </p>
                        ) : null}
                        <div className="mt-2 flex items-center gap-3">
                          <span
                            className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={mission.target}
                            aria-valuenow={progress ?? 0}
                            aria-label={mission.title}
                          >
                            <span
                              className="block h-full rounded-full bg-violet-500"
                              style={{ width: `${percent}%` }}
                            />
                          </span>
                          <span className="text-xs text-slate-300">
                            {progress == null
                              ? `ціль ${mission.target}`
                              : `${Math.min(progress, mission.target)} / ${mission.target}`}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-500">
                          {MISSION_METRIC[mission.metric]} · до{" "}
                          {DAY_MONTH.format(new Date(String(mission.endsAt)))}
                          {progress == null
                            ? " · увійдіть, щоб бачити прогрес"
                            : ""}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            ) : null}
            {weeklyTop ? (
              <Panel
                title="Топ учасників тижня"
                icon={
                  <Trophy
                    className="size-5 text-amber-300"
                    aria-hidden="true"
                  />
                }
              >
                {topScorers.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-slate-400">
                    Цього тижня ще ніхто не набрав балів.
                  </p>
                ) : null}
                <ol className="px-2 pb-1">
                  {topScorers.map((entry) => (
                    <li
                      key={entry.userId}
                      className="flex items-center gap-2.5 py-1.5 text-sm"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs text-slate-300">
                        {entry.rank}
                      </span>
                      <ForumAvatar
                        member={entry}
                        className="size-7 text-[10px]"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {entry.displayName || entry.username}
                      </span>
                      <span className="text-xs text-slate-300">
                        {forumCount(entry.communityPoints)}
                      </span>
                    </li>
                  ))}
                </ol>
              </Panel>
            ) : null}
            <Panel
              title="Популярні теги"
              icon={
                <span
                  className="text-xl font-bold text-violet-300"
                  aria-hidden="true"
                >
                  #
                </span>
              }
            >
              {hub.forumPopularTags.length ? (
                <ul className="grid grid-cols-2 gap-2 px-2 pb-1 sm:grid-cols-3 xl:grid-cols-2">
                  {hub.forumPopularTags.map((tag) => (
                    <li
                      key={tag.slug}
                      className="flex min-w-0 items-center justify-between gap-1 rounded-md bg-white/[0.04] px-2 py-1.5 text-xs text-slate-200"
                    >
                      <span className="truncate">#{tag.label}</span>
                      <span className="text-slate-500">
                        {forumCount(tag.topicCount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 py-3 text-sm text-slate-400">
                  Тегів поки немає.
                </p>
              )}
            </Panel>
            {hub.communityEvents.length ? (
              <Panel
                title="Найближчі події"
                icon={
                  <CalendarDays
                    className="size-5 text-violet-300"
                    aria-hidden="true"
                  />
                }
              >
                <ul className="space-y-2 px-2 pb-1">
                  {hub.communityEvents.map((event) => {
                    const start = new Date(String(event.startsAt));
                    const body = (
                      <>
                        <span className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-white/[0.06] py-1">
                          <span className="text-base leading-tight font-bold">
                            {start.getDate()}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {MONTH.format(start)}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {event.title}
                          </span>
                          <span className="block truncate text-xs text-slate-400">
                            {EVENT_TIME.format(start)} ·{" "}
                            {event.format === "ONLINE"
                              ? "Онлайн"
                              : (event.location ?? "Офлайн")}
                          </span>
                        </span>
                      </>
                    );
                    return (
                      <li key={event.id}>
                        {event.url ? (
                          <a
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-white/[0.04]"
                          >
                            {body}
                          </a>
                        ) : (
                          <div className="flex items-center gap-3 p-1.5">
                            {body}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            ) : null}
          </aside>
        </div>
      </div>
    </DssApplicationShell>
  );
}
