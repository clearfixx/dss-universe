/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/app/community/page.tsx
 *
 * 🎯 Purpose:
 * Community Hub home (owner mockups "Центр спільноти" and the hub
 * proposal): counters, the viewer's followed topics, topics that need help,
 * unanswered topics, all sections with activity, and popular tags.
 *
 * ⚠️ Important:
 * Every block honours forum visibility (decided by the API). Blocks without
 * an owner decision or API yet (events, AI, missions) are left out.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BellRing,
  HelpCircle,
  MessageSquare,
  MessagesSquare,
  Plus,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { loadSessionViewer } from "@/features/auth/session-data";
import {
  loadForumCategories,
  loadForumHub,
  loadViewerForumTopics,
} from "@/features/forum/forum-data";
import {
  forumMemberName,
  forumUnreadCount,
} from "@/features/forum/forum-format";

export const metadata: Metadata = {
  title: "Community Hub | DSS Universe",
  description: "Питання, обговорення та досвід спільноти DSS Universe.",
};

const number = new Intl.NumberFormat("uk-UA", { notation: "compact" });
const relative = new Intl.RelativeTimeFormat("uk-UA", { numeric: "auto" });
function ago(value: unknown): string {
  const minutes = Math.round(
    (Date.now() - new Date(String(value)).getTime()) / 60000,
  );
  if (minutes < 60) return relative.format(-Math.max(minutes, 0), "minute");
  if (minutes < 1440) return relative.format(-Math.round(minutes / 60), "hour");
  return relative.format(-Math.round(minutes / 1440), "day");
}

type TopicRow = {
  id: string;
  title: string;
  lastPostAt: unknown;
  createdAt: unknown;
  postCount: number;
  lastPostNumber: number;
  viewerLastReadNumber?: number | null;
  tags: ReadonlyArray<{ id: string; label: string }>;
  author?: { username: string; displayName?: string | null } | null;
};

function Panel({
  title,
  icon,
  more,
  children,
}: {
  title: string;
  icon: ReactNode;
  more?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0f1328] p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="font-semibold">{title}</h2>
        {more ? (
          <Link
            href={more.href}
            className="ml-auto text-sm text-violet-300 hover:text-violet-200"
          >
            {more.label} →
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function TopicList({
  topics,
  empty,
  meta,
}: {
  topics: readonly TopicRow[];
  empty: string;
  meta: (topic: TopicRow) => string;
}) {
  if (topics.length === 0)
    return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-2">
      {topics.map((topic) => {
        const unread = forumUnreadCount(topic);
        return (
          <li key={topic.id}>
            <Link
              href={`/community/forum/topics/${topic.id}`}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 hover:border-violet-400/40"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">
                  {topic.title}
                </span>
                <span className="block truncate text-xs text-slate-400">
                  {meta(topic)}
                </span>
              </span>
              {unread ? (
                <span className="rounded-md bg-violet-600 px-2 py-0.5 text-xs font-semibold text-white">
                  +{unread}
                </span>
              ) : topic.tags[0] ? (
                <span className="rounded-md border border-white/10 px-2 py-0.5 text-xs text-slate-300">
                  {topic.tags[0].label}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function CommunityHubRoute() {
  const viewer = await loadSessionViewer();
  const [hub, categories, followed] = await Promise.all([
    loadForumHub(),
    loadForumCategories(),
    viewer ? loadViewerForumTopics("SUBSCRIBED", 1) : null,
  ]);
  const stats = hub.forumHubStats;
  const replies = (topic: TopicRow) => Math.max(0, topic.postCount - 1);

  return (
    <DssApplicationShell
      pageTitle={{ pathname: "/community", title: "Community Hub" }}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(120%_140%_at_85%_-20%,#3b2a8c_0%,#171a3a_38%,#0d1024_70%)] p-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200">
              <Users className="size-7" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold tracking-tight">
                Community Hub
              </h1>
              <p className="mt-1 text-slate-300">
                Питання, обговорення та досвід спільноти DSS. Тут ви знаходите
                відповіді й ділитеся своїми.
              </p>
            </div>
            {viewer ? (
              <Link
                href="/community/forum/new"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,.35)] hover:bg-violet-500"
              >
                <Plus className="size-4" aria-hidden="true" />
                Створити тему
              </Link>
            ) : (
              <Link
                href="/login?returnTo=/community"
                className="inline-flex min-h-10 items-center rounded-lg border border-white/15 px-4 text-sm font-semibold text-white hover:border-violet-400"
              >
                Увійти, щоб писати
              </Link>
            )}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Розділів", stats.forumCount],
              ["Тем", stats.topicCount],
              ["Дописів", stats.postCount],
              ["Учасників обговорень", stats.participantCount],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-[#0d1024]/70 px-4 py-3"
              >
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd className="text-xl font-bold">
                  {number.format(Number(value))}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {followed ? (
                <Panel
                  title="Нове у ваших підписках"
                  icon={
                    <BellRing
                      className="size-5 text-violet-300"
                      aria-hidden="true"
                    />
                  }
                >
                  <TopicList
                    topics={followed.items.slice(0, 5)}
                    empty="Стежте за темами — нові відповіді з’являться тут."
                    meta={(topic) =>
                      `${replies(topic)} відповідей · ${ago(topic.lastPostAt)}`
                    }
                  />
                </Panel>
              ) : (
                <Panel
                  title="Ще без відповідей"
                  icon={
                    <MessageSquare
                      className="size-5 text-violet-300"
                      aria-hidden="true"
                    />
                  }
                >
                  <TopicList
                    topics={hub.quiet.items}
                    empty="Усі теми вже отримали відповіді."
                    meta={(topic) =>
                      `${forumMemberName(topic.author)} · ${ago(topic.createdAt)}`
                    }
                  />
                </Panel>
              )}
              <Panel
                title="Потрібна допомога"
                icon={
                  <HelpCircle
                    className="size-5 text-amber-300"
                    aria-hidden="true"
                  />
                }
              >
                <TopicList
                  topics={hub.help.items}
                  empty="Усі питання мають прийняту відповідь."
                  meta={(topic) =>
                    `${replies(topic)} відповідей · ${ago(topic.createdAt)}`
                  }
                />
                {hub.help.total > hub.help.items.length ? (
                  <p className="mt-3 text-xs text-slate-400">
                    Ще {hub.help.total - hub.help.items.length} питань чекають
                    на відповідь.
                  </p>
                ) : null}
              </Panel>
            </div>

            <section aria-labelledby="hub-sections" className="space-y-4">
              <h2 id="hub-sections" className="text-xl font-semibold">
                Розділи форуму
              </h2>
              {categories.length === 0 ? (
                <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">
                  Розділів поки немає.
                </p>
              ) : null}
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1328]"
                >
                  <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#12163a] px-4 py-3">
                    <h3 className="font-semibold">{category.title}</h3>
                    {category.visibility !== "PUBLIC" ? (
                      <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200">
                        {category.visibility === "MEMBERS"
                          ? "Для учасників"
                          : "Обмежений доступ"}
                      </span>
                    ) : null}
                    {category.description ? (
                      <span className="text-sm text-slate-400">
                        {category.description}
                      </span>
                    ) : null}
                  </div>
                  <ul>
                    {category.forums.map((forum) => (
                      <li
                        key={forum.id}
                        className="grid items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0 md:grid-cols-[2.5rem_minmax(0,1fr)_6rem_6rem_minmax(0,14rem)]"
                      >
                        <span className="hidden size-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200 md:flex">
                          <MessagesSquare
                            className="size-5"
                            aria-hidden="true"
                          />
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/community/forum/${forum.id}`}
                            className="font-semibold text-white hover:text-violet-200"
                          >
                            {forum.title}
                          </Link>
                          {forum.description ? (
                            <p className="truncate text-xs text-slate-400">
                              {forum.description}
                            </p>
                          ) : null}
                          {forum.subforums.length ? (
                            <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
                              {forum.subforums.map((sub) => (
                                <Link
                                  key={sub.id}
                                  href={`/community/forum/${sub.id}`}
                                  className="text-violet-300 hover:text-violet-200"
                                >
                                  {sub.title}
                                </Link>
                              ))}
                            </p>
                          ) : null}
                        </div>
                        <span className="text-sm md:text-right">
                          <strong>
                            {number.format(forum.activity.topicCount)}
                          </strong>{" "}
                          <span className="text-slate-400">тем</span>
                        </span>
                        <span className="text-sm md:text-right">
                          <strong>
                            {number.format(forum.activity.postCount)}
                          </strong>{" "}
                          <span className="text-slate-400">дописів</span>
                        </span>
                        {forum.activity.lastActivity ? (
                          <Link
                            href={`/community/forum/topics/${forum.activity.lastActivity.topicId}#post-${forum.activity.lastActivity.lastPostNumber}`}
                            className="min-w-0 text-xs text-slate-400 hover:text-slate-200"
                          >
                            <span className="block truncate text-sm text-slate-200">
                              {forum.activity.lastActivity.title}
                            </span>
                            {forumMemberName(
                              forum.activity.lastActivity.author,
                            )}{" "}
                            · {ago(forum.activity.lastActivity.lastPostAt)}
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Ще немає тем
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          </div>

          <aside className="space-y-4">
            {followed ? (
              <Panel
                title="Ще без відповідей"
                icon={
                  <MessageSquare
                    className="size-5 text-violet-300"
                    aria-hidden="true"
                  />
                }
              >
                <TopicList
                  topics={hub.quiet.items}
                  empty="Усі теми вже отримали відповіді."
                  meta={(topic) =>
                    `${forumMemberName(topic.author)} · ${ago(topic.createdAt)}`
                  }
                />
              </Panel>
            ) : null}
            <Panel
              title="Популярні теги"
              icon={
                <span
                  className="text-lg font-bold text-violet-300"
                  aria-hidden="true"
                >
                  #
                </span>
              }
            >
              {hub.forumPopularTags.length ? (
                <ul className="flex flex-wrap gap-2">
                  {hub.forumPopularTags.map((tag) => (
                    <li
                      key={tag.slug}
                      className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-200"
                    >
                      #{tag.label}{" "}
                      <span className="text-slate-500">
                        {number.format(tag.topicCount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">Тегів поки немає.</p>
              )}
            </Panel>
          </aside>
        </div>
      </div>
    </DssApplicationShell>
  );
}
