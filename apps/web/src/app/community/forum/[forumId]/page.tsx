/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/app/community/forum/[forumId]/page.tsx
 *
 * 🎯 Purpose:
 * Forum section page from the owner mockups: header with counters, sort
 * tabs, filters, tags, subforums and the topic table (pinned first).
 *
 * ⚠️ Important:
 * Hidden or missing forums render 404 (the API decides visibility). All
 * controls are plain links, so the page works without client JavaScript.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Archive,
  CheckCircle2,
  Eye,
  Flame,
  HelpCircle,
  Lock,
  MessageSquare,
  MessagesSquare,
  Pin,
  Plus,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { loadSessionViewer } from "@/features/auth/session-data";
import {
  FORUM_PAGE_SIZE,
  loadForumCategories,
  loadForumTags,
  loadForumTopics,
} from "@/features/forum/forum-data";
import {
  forumMemberName,
  forumScore,
  forumUnreadCount,
} from "@/features/forum/forum-format";
import type {
  ForumTopicFilter,
  ForumTopicScope,
  ForumTopicSort,
} from "@/gql/graphql";

type Props = {
  params: Promise<{ forumId: string }>;
  searchParams: Promise<{
    sort?: string;
    filter?: string;
    tag?: string;
    scope?: string;
    page?: string;
  }>;
};

const SORTS: ReadonlyArray<{ id: ForumTopicSort; label: string }> = [
  { id: "LAST_ACTIVITY", label: "Остання активність" },
  { id: "HOT", label: "Гарячі" },
  { id: "NEW", label: "Нові" },
  { id: "TOP", label: "Найкращі" },
];
const FILTERS: ReadonlyArray<{
  id: ForumTopicFilter;
  label: string;
  signedIn?: boolean;
}> = [
  { id: "ALL", label: "Усі теми" },
  { id: "UNSOLVED", label: "Без прийнятої відповіді" },
  { id: "NO_REPLIES", label: "Без відповідей" },
  { id: "MINE", label: "Мої теми", signedIn: true },
];

const pick = <T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T => (allowed.includes(value as T) ? (value as T) : fallback);

const relative = new Intl.RelativeTimeFormat("uk-UA", { numeric: "auto" });
function ago(value: unknown): string {
  const minutes = Math.round(
    (Date.now() - new Date(String(value)).getTime()) / 60000,
  );
  if (minutes < 60) return relative.format(-Math.max(minutes, 0), "minute");
  if (minutes < 1440) return relative.format(-Math.round(minutes / 60), "hour");
  return relative.format(-Math.round(minutes / 1440), "day");
}

async function findForum(forumId: string) {
  const categories = await loadForumCategories();
  for (const category of categories) {
    for (const forum of category.forums) {
      if (forum.id === forumId) return { category, forum, parent: null };
      const sub = forum.subforums.find((item) => item.id === forumId);
      if (sub) return { category, forum: sub, parent: forum };
    }
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await findForum((await params).forumId);
  return {
    title: found
      ? `${found.forum.title} | Форум DSS Universe`
      : "Розділ не знайдено | DSS Universe",
  };
}

export default async function ForumSectionRoute({
  params,
  searchParams,
}: Props) {
  const { forumId } = await params;
  const query = await searchParams;
  const found = await findForum(forumId);
  if (!found) notFound();
  const { category, forum, parent } = found;

  const viewer = await loadSessionViewer();
  const sort = pick(
    query.sort,
    SORTS.map((s) => s.id),
    "LAST_ACTIVITY",
  );
  const filter = pick(
    query.filter,
    FILTERS.filter((f) => !f.signedIn || viewer).map((f) => f.id),
    "ALL",
  );
  const scope = pick<ForumTopicScope>(
    query.scope,
    ["ACTIVE", "ARCHIVED"],
    "ACTIVE",
  );
  const page = Math.max(1, Number(query.page) || 1);
  const [list, tags] = await Promise.all([
    loadForumTopics({
      forumId,
      sort,
      filter,
      scope,
      tagSlug: query.tag ?? null,
      page,
    }),
    loadForumTags(forumId),
  ]);
  if (!list) notFound();

  const path = `/community/forum/${forumId}`;
  const href = (change: Record<string, string | number | null>) => {
    const next = new URLSearchParams();
    const merged = {
      sort,
      filter,
      scope,
      tag: query.tag ?? null,
      page,
      ...change,
    };
    if (merged.sort !== "LAST_ACTIVITY") next.set("sort", String(merged.sort));
    if (merged.filter !== "ALL") next.set("filter", String(merged.filter));
    if (merged.scope !== "ACTIVE") next.set("scope", String(merged.scope));
    if (merged.tag) next.set("tag", String(merged.tag));
    if (Number(merged.page) > 1) next.set("page", String(merged.page));
    const qs = next.toString();
    return qs ? `${path}?${qs}` : path;
  };
  const pages = Math.max(1, Math.ceil(list.total / FORUM_PAGE_SIZE));
  const pill = (active: boolean) =>
    `inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-medium transition ${
      active
        ? "bg-violet-600 text-white"
        : "border border-white/10 text-slate-300 hover:border-violet-400/40 hover:text-white"
    }`;
  const subforums = parent ? [] : "subforums" in forum ? forum.subforums : [];
  const activity = "activity" in forum ? forum.activity : null;

  return (
    <DssApplicationShell pageTitle={{ pathname: path, title: forum.title }}>
      <div className="mx-auto max-w-7xl space-y-5">
        <nav
          aria-label="Хлібні крихти"
          className="flex flex-wrap items-center gap-2 text-sm text-slate-400"
        >
          <Link href="/community" className="hover:text-white">
            Спільнота
          </Link>
          <span aria-hidden="true">›</span>
          <span>{category.title}</span>
          {parent ? (
            <>
              <span aria-hidden="true">›</span>
              <Link
                href={`/community/forum/${parent.id}`}
                className="hover:text-white"
              >
                {parent.title}
              </Link>
            </>
          ) : null}
          <span aria-hidden="true">›</span>
          <span className="text-slate-200">{forum.title}</span>
        </nav>

        <header className="flex flex-wrap items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200">
            <MessagesSquare className="size-7" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold sm:text-3xl">{forum.title}</h1>
            {forum.description ? (
              <p className="mt-1 text-sm text-slate-400">{forum.description}</p>
            ) : null}
          </div>
          {activity ? (
            <dl className="flex gap-6 text-sm">
              <div>
                <dt className="text-slate-400">тем</dt>
                <dd className="text-lg font-semibold">{activity.topicCount}</dd>
              </div>
              <div>
                <dt className="text-slate-400">дописів</dt>
                <dd className="text-lg font-semibold">{activity.postCount}</dd>
              </div>
            </dl>
          ) : null}
          {viewer ? (
            <Link
              href={`/community/forum/new?forum=${forumId}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500"
            >
              <Plus className="size-4" aria-hidden="true" />
              Створити тему
            </Link>
          ) : null}
        </header>

        {subforums.length ? (
          <section
            aria-label="Підрозділи"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {subforums.map((sub) => (
              <Link
                key={sub.id}
                href={`/community/forum/${sub.id}`}
                className="rounded-xl border border-white/10 bg-[#0f1328] p-4 hover:border-violet-400/40"
              >
                <p className="font-semibold">{sub.title}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {sub.activity.topicCount} тем · {sub.activity.postCount}{" "}
                  дописів
                </p>
              </Link>
            ))}
          </section>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#0f1328] p-2">
          <nav aria-label="Сортування" className="flex flex-wrap gap-1">
            {SORTS.map((item) => (
              <Link
                key={item.id}
                href={href({ sort: item.id, page: 1 })}
                aria-current={item.id === sort ? "page" : undefined}
                className={pill(item.id === sort)}
              >
                {item.id === "HOT" ? (
                  <Flame className="mr-1 size-4" aria-hidden="true" />
                ) : null}
                {item.label}
              </Link>
            ))}
          </nav>
          <span
            className="mx-1 hidden h-6 w-px bg-white/10 sm:block"
            aria-hidden="true"
          />
          <nav aria-label="Фільтр" className="flex flex-wrap gap-1">
            {FILTERS.filter((item) => !item.signedIn || viewer).map((item) => (
              <Link
                key={item.id}
                href={href({ filter: item.id, page: 1 })}
                aria-current={item.id === filter ? "page" : undefined}
                className={pill(item.id === filter)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href={href({
              scope: scope === "ARCHIVED" ? "ACTIVE" : "ARCHIVED",
              page: 1,
            })}
            className={`ml-auto ${pill(scope === "ARCHIVED")}`}
          >
            <Archive className="mr-1 size-4" aria-hidden="true" />
            Архів
          </Link>
        </div>

        {tags.length ? (
          <div className="flex flex-wrap gap-2" aria-label="Теги розділу">
            {tags
              .filter((tag) => tag.active)
              .map((tag) => (
                <Link
                  key={tag.id}
                  href={href({
                    tag: query.tag === tag.slug ? null : tag.slug,
                    page: 1,
                  })}
                  aria-current={query.tag === tag.slug ? "true" : undefined}
                  className={`rounded-md border px-2.5 py-1 text-xs ${
                    query.tag === tag.slug
                      ? "border-violet-400 bg-violet-500/20 text-violet-100"
                      : "border-white/10 text-slate-300 hover:border-violet-400/40"
                  }`}
                >
                  #{tag.label}
                </Link>
              ))}
          </div>
        ) : null}

        <section
          aria-label="Теми"
          className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1328]"
        >
          {list.items.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">
              {filter === "ALL" && !query.tag
                ? "У цьому розділі ще немає тем."
                : "Тем за цими умовами не знайдено."}
            </p>
          ) : (
            <ul>
              {list.items.map((topic) => {
                const unread = forumUnreadCount(topic);
                const score = forumScore(topic);
                return (
                  <li
                    key={topic.id}
                    className={`grid items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0 sm:grid-cols-[2rem_minmax(0,1fr)_5rem_5rem_11rem] ${
                      topic.pinned ? "bg-violet-500/[0.06]" : ""
                    }`}
                  >
                    <span className="hidden text-slate-400 sm:block">
                      {topic.pinned ? (
                        <Pin
                          className="size-5 text-amber-300"
                          aria-label="Закріплено"
                        />
                      ) : topic.acceptedAnswerPostId ? (
                        <CheckCircle2
                          className="size-5 text-emerald-400"
                          aria-label="Є прийнята відповідь"
                        />
                      ) : topic.state !== "OPEN" ? (
                        <Lock className="size-5" aria-label="Закрита" />
                      ) : topic.kind === "QUESTION" ? (
                        <HelpCircle className="size-5" aria-label="Питання" />
                      ) : (
                        <MessageSquare
                          className="size-5"
                          aria-label="Обговорення"
                        />
                      )}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {unread ? (
                          <span
                            className="size-2 rounded-full bg-violet-400"
                            aria-label={`${unread} непрочитаних`}
                          />
                        ) : null}
                        <Link
                          href={`/community/forum/topics/${topic.id}`}
                          className={`truncate hover:text-violet-200 ${
                            unread
                              ? "font-semibold text-white"
                              : "text-slate-100"
                          }`}
                        >
                          {topic.title}
                        </Link>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                        <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-violet-200">
                          {topic.kind === "QUESTION"
                            ? "Питання"
                            : "Обговорення"}
                        </span>
                        {topic.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded border border-white/10 px-1.5 py-0.5"
                          >
                            {tag.label}
                          </span>
                        ))}
                        <span>· {forumMemberName(topic.author)}</span>
                        <span title="Рейтинг">
                          · {score > 0 ? `+${score}` : score}
                        </span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-sm text-slate-300 sm:justify-end">
                      <MessageSquare className="size-4" aria-hidden="true" />
                      {Math.max(0, topic.postCount - 1)}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-slate-400 sm:justify-end">
                      <Eye className="size-4" aria-hidden="true" />
                      {topic.viewCount}
                    </span>
                    <span className="text-xs text-slate-400 sm:text-right">
                      <span className="block truncate text-slate-200">
                        {forumMemberName(topic.lastPostAuthor)}
                      </span>
                      {ago(topic.lastPostAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {pages > 1 ? (
          <nav
            aria-label="Сторінки"
            className="flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            <span className="text-slate-400">
              Показано {(page - 1) * FORUM_PAGE_SIZE + 1}–
              {Math.min(page * FORUM_PAGE_SIZE, list.total)} з {list.total}
            </span>
            <span className="flex flex-wrap gap-2">
              {Array.from({ length: pages }, (_, index) => index + 1)
                .filter(
                  (n) => n === 1 || n === pages || Math.abs(n - page) <= 2,
                )
                .map((n) => (
                  <Link
                    key={n}
                    href={href({ page: n })}
                    aria-current={n === page ? "page" : undefined}
                    className={`flex size-9 items-center justify-center rounded-lg border ${
                      n === page
                        ? "border-violet-500 bg-violet-600 text-white"
                        : "border-white/10 text-slate-300 hover:border-violet-400/50"
                    }`}
                  >
                    {n}
                  </Link>
                ))}
            </span>
          </nav>
        ) : null}
      </div>
    </DssApplicationShell>
  );
}
