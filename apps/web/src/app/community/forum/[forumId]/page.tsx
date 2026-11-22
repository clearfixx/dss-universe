/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/app/community/forum/[forumId]/page.tsx
 *
 * 🎯 Purpose:
 * Forum section page after the owner mockup "Форум Next.js": header with
 * counters, section tabs, sort pills, pinned block, the topic table and
 * pagination; aside with the section description, status filters, tags
 * and related sections.
 *
 * ⚠️ Important:
 * Hidden or missing forums render 404 (the API decides visibility). All
 * controls are plain links, so the page works without client JavaScript.
 * Mockup parts without an API yet (follow a section, type filter, filter
 * counts, member count, rules page) are left out or marked "скоро".
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Flame,
  HelpCircle,
  Lock,
  MessageSquare,
  MessageSquareText,
  Pin,
  Plus,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { loadSessionViewer } from "@/features/auth/session-data";
import { ForumAvatar } from "@/features/forum/forum-avatar";
import {
  FORUM_PAGE_SIZE,
  loadForumCategories,
  loadForumTags,
  loadForumTopics,
} from "@/features/forum/forum-data";
import {
  forumAgo,
  forumCount,
  forumMemberName,
  forumPlural,
  forumUnreadCount,
} from "@/features/forum/forum-format";
import { ForumSectionIcon } from "@/features/forum/forum-section-icon";
import type {
  ForumTopicFilter,
  ForumTopicScope,
  ForumTopicSort,
  ForumTopicsQuery,
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

type Topic = ForumTopicsQuery["forumTopics"]["items"][number];

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
const TOPICS = ["тема", "теми", "тем"] as const;
const POSTS = ["допис", "дописи", "дописів"] as const;
const REPLIES = ["відповідь", "відповіді", "відповідей"] as const;

const pick = <T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T => (allowed.includes(value as T) ? (value as T) : fallback);

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

function TopicRow({ topic }: { topic: Topic }) {
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
  const subforums = parent ? [] : "subforums" in forum ? forum.subforums : [];
  const siblings = (parent ? parent.subforums : category.forums).filter(
    (item) => item.id !== forum.id,
  );
  const activity = forum.activity;
  const pinned = list.items.filter((topic) => topic.pinned);
  const regular = list.items.filter((topic) => !topic.pinned);
  const activeTags = tags.filter((tag) => tag.active);
  const filtered = filter !== "ALL" || scope !== "ACTIVE" || Boolean(query.tag);

  const pill = (active: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition ${
      active
        ? "bg-violet-600 text-white"
        : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
    }`;
  const tabClass =
    "relative inline-flex h-11 shrink-0 items-center px-3 text-sm";
  const pageLink = (n: number, label: ReactNode, current = false) => (
    <Link
      key={`${n}-${String(label)}`}
      href={href({ page: n })}
      aria-current={current ? "page" : undefined}
      className={`flex size-9 items-center justify-center rounded-lg text-sm ${
        current
          ? "bg-violet-600 font-semibold text-white"
          : "text-slate-300 hover:bg-white/[0.06]"
      }`}
    >
      {label}
    </Link>
  );
  const shown = Array.from({ length: pages }, (_, index) => index + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 2,
  );

  return (
    <DssApplicationShell
      pageTitle={{ pathname: path, title: forum.title }}
      breadcrumbs={[
        { href: "/community", label: "Спільнота" },
        { href: "/community", label: "Форум" },
        { href: `/community?category=${category.id}`, label: category.title },
        ...(parent
          ? [{ href: `/community/forum/${parent.id}`, label: parent.title }]
          : []),
        { label: forum.title },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem] 2xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-4">
          <header className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex min-w-0 flex-1 basis-80 items-center gap-4">
              <ForumSectionIcon slug={forum.slug} className="size-14" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {forum.title}
                </h1>
                {forum.description ? (
                  <p className="mt-0.5 text-sm text-slate-400">
                    {forum.description}
                  </p>
                ) : null}
              </div>
            </div>
            <dl className="flex gap-5">
              {(
                [
                  [MessageSquareText, activity.topicCount, TOPICS],
                  [FileText, activity.postCount, POSTS],
                ] as const
              ).map(([Icon, value, forms]) => (
                <div key={forms[0]} className="flex items-center gap-2">
                  <Icon className="size-5 text-slate-400" aria-hidden="true" />
                  <div className="flex flex-col-reverse">
                    <dt className="text-xs text-slate-400">
                      {forumPlural(value, forms)}
                    </dt>
                    <dd className="text-lg leading-tight font-bold">
                      {forumCount(value)}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
            {viewer ? (
              <Link
                href={`/community/forum/new?forum=${forumId}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,.3)] hover:bg-violet-500"
              >
                <Plus className="size-4" aria-hidden="true" />
                Створити тему
              </Link>
            ) : (
              <Link
                href={`/login?returnTo=${encodeURIComponent(path)}`}
                className="inline-flex h-10 items-center rounded-lg border border-white/15 px-4 text-sm font-semibold text-white hover:border-violet-400"
              >
                Увійти, щоб писати
              </Link>
            )}
          </header>

          <nav
            aria-label="Розділ"
            className="flex overflow-x-auto border-b border-white/[0.07]"
          >
            <Link
              href={path}
              aria-current="page"
              className={`${tabClass} font-semibold text-white after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-violet-500`}
            >
              Теми
            </Link>
            {["Про розділ", "Правила"].map((label) => (
              <a
                key={label}
                href="#"
                title="Скоро"
                aria-disabled="true"
                className={`${tabClass} cursor-default text-slate-500`}
              >
                {label}
              </a>
            ))}
            {subforums.length ? (
              <a
                href="#subforums"
                className={`${tabClass} text-slate-400 hover:text-white`}
              >
                Підрозділи ({subforums.length})
              </a>
            ) : null}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <nav aria-label="Сортування" className="flex flex-wrap gap-2">
              {SORTS.map((item) => (
                <Link
                  key={item.id}
                  href={href({ sort: item.id, page: 1 })}
                  aria-current={item.id === sort ? "page" : undefined}
                  className={pill(item.id === sort)}
                >
                  {item.label}
                  {item.id === "HOT" ? (
                    <Flame
                      className="size-4 text-orange-400"
                      aria-hidden="true"
                    />
                  ) : null}
                </Link>
              ))}
            </nav>
            <Link
              href={href({
                scope: scope === "ARCHIVED" ? "ACTIVE" : "ARCHIVED",
                page: 1,
              })}
              aria-current={scope === "ARCHIVED" ? "page" : undefined}
              className={`ml-auto ${pill(scope === "ARCHIVED")}`}
            >
              <Archive className="size-4" aria-hidden="true" />
              Архів
            </Link>
          </div>

          {subforums.length ? (
            <section
              id="subforums"
              aria-label="Підрозділи"
              className="grid scroll-mt-24 gap-2 sm:grid-cols-2 2xl:grid-cols-3"
            >
              {subforums.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/community/forum/${sub.id}`}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.07] bg-card px-3 py-2.5 hover:border-violet-400/40"
                >
                  <ForumSectionIcon slug={sub.slug} className="size-9" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {sub.title}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {forumCount(sub.activity.topicCount)}{" "}
                      {forumPlural(sub.activity.topicCount, TOPICS)} ·{" "}
                      {forumCount(sub.activity.postCount)}{" "}
                      {forumPlural(sub.activity.postCount, POSTS)}
                    </span>
                  </span>
                </Link>
              ))}
            </section>
          ) : null}

          {pinned.length ? (
            <section
              aria-labelledby="pinned-topics"
              className="overflow-hidden rounded-xl border border-violet-500/30 bg-violet-950/30"
            >
              <h2
                id="pinned-topics"
                className="flex items-center gap-2 border-b border-violet-500/20 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold"
              >
                <Pin className="size-4 text-violet-300" aria-hidden="true" />
                Закріплені теми
                <span className="rounded-md bg-white/10 px-1.5 text-xs">
                  {pinned.length}
                </span>
              </h2>
              <ul>
                {pinned.map((topic) => (
                  <TopicRow key={topic.id} topic={topic} />
                ))}
              </ul>
            </section>
          ) : null}

          <section
            aria-label="Теми"
            className="overflow-hidden rounded-xl border border-white/[0.07] bg-card"
          >
            {regular.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">
                {pinned.length
                  ? "Інших тем на цій сторінці немає."
                  : filtered
                    ? "Тем за цими умовами не знайдено."
                    : "У цьому розділі ще немає тем."}
              </p>
            ) : (
              <ul>
                {regular.map((topic) => (
                  <TopicRow key={topic.id} topic={topic} />
                ))}
              </ul>
            )}
            {list.total > 0 ? (
              <nav
                aria-label="Сторінки"
                className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-2.5 text-sm"
              >
                <span className="text-slate-400">
                  Показано {(page - 1) * FORUM_PAGE_SIZE + 1}–
                  {Math.min(page * FORUM_PAGE_SIZE, list.total)} з {list.total}{" "}
                  {forumPlural(list.total, TOPICS)}
                </span>
                {pages > 1 ? (
                  <span className="flex items-center gap-1">
                    {page > 1
                      ? pageLink(
                          page - 1,
                          <ChevronLeft
                            className="size-4"
                            aria-label="Попередня"
                          />,
                        )
                      : null}
                    {shown.map((n, index) => (
                      <span key={n} className="flex items-center gap-1">
                        {index > 0 && n - shown[index - 1] > 1 ? (
                          <span className="px-1 text-slate-500">…</span>
                        ) : null}
                        {pageLink(n, n, n === page)}
                      </span>
                    ))}
                    {page < pages
                      ? pageLink(
                          page + 1,
                          <ChevronRight
                            className="size-4"
                            aria-label="Наступна"
                          />,
                        )
                      : null}
                  </span>
                ) : null}
              </nav>
            ) : null}
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-xl border border-white/[0.07] bg-card p-4">
            <h2 className="font-semibold">Про розділ</h2>
            <p className="mt-2 text-sm text-slate-300">
              {forum.description || "Опис розділу ще не додано."}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Категорія:{" "}
              <Link
                href={`/community?category=${category.id}`}
                className="text-violet-300 hover:text-violet-200"
              >
                {category.title}
              </Link>
            </p>
          </section>

          <section className="rounded-xl border border-white/[0.07] bg-card p-4">
            <div className="flex items-center">
              <h2 className="font-semibold">Фільтри</h2>
              {filtered ? (
                <Link
                  href={href({
                    filter: "ALL",
                    scope: "ACTIVE",
                    tag: null,
                    page: 1,
                  })}
                  className="ml-auto text-xs text-violet-300 hover:text-violet-200"
                >
                  Скинути
                </Link>
              ) : null}
            </div>
            <h3 className="mt-3 text-xs font-medium text-slate-400">Статус</h3>
            <ul className="mt-1.5 space-y-0.5">
              {FILTERS.filter((item) => !item.signedIn || viewer).map(
                (item) => {
                  const active = item.id === filter && scope === "ACTIVE";
                  return (
                    <li key={item.id}>
                      <Link
                        href={href({
                          filter: item.id,
                          scope: "ACTIVE",
                          page: 1,
                        })}
                        aria-current={active ? "page" : undefined}
                        className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm text-slate-200 hover:bg-white/[0.04]"
                      >
                        <span
                          aria-hidden="true"
                          className={`flex size-4 items-center justify-center rounded border ${
                            active
                              ? "border-violet-500 bg-violet-600"
                              : "border-white/25"
                          }`}
                        >
                          {active ? (
                            <span className="size-1.5 rounded-full bg-white" />
                          ) : null}
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  );
                },
              )}
              <li>
                <Link
                  href={href({ filter: "ALL", scope: "ARCHIVED", page: 1 })}
                  aria-current={scope === "ARCHIVED" ? "page" : undefined}
                  className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm text-slate-200 hover:bg-white/[0.04]"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-4 items-center justify-center rounded border ${
                      scope === "ARCHIVED"
                        ? "border-violet-500 bg-violet-600"
                        : "border-white/25"
                    }`}
                  >
                    {scope === "ARCHIVED" ? (
                      <span className="size-1.5 rounded-full bg-white" />
                    ) : null}
                  </span>
                  Архівні
                </Link>
              </li>
            </ul>
          </section>

          {activeTags.length ? (
            <section className="rounded-xl border border-white/[0.07] bg-card p-4">
              <h2 className="font-semibold">Теги розділу</h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {activeTags.map((tag) => {
                  const active = query.tag === tag.slug;
                  return (
                    <li key={tag.id}>
                      <Link
                        href={href({ tag: active ? null : tag.slug, page: 1 })}
                        aria-current={active ? "true" : undefined}
                        className={`inline-flex rounded-md px-2 py-1 text-xs ${
                          active
                            ? "bg-violet-600 text-white"
                            : "bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]"
                        }`}
                      >
                        #{tag.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {siblings.length ? (
            <section className="rounded-xl border border-white/[0.07] bg-card p-2">
              <h2 className="px-2 pt-2 pb-1 font-semibold">Схожі розділи</h2>
              <ul>
                {siblings.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/community/forum/${item.id}`}
                      className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.04]"
                    >
                      <ForumSectionIcon slug={item.slug} className="size-9" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {item.title}
                        </span>
                        {item.description ? (
                          <span className="block truncate text-xs text-slate-400">
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                      <ChevronRight
                        className="size-4 shrink-0 text-slate-500"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </DssApplicationShell>
  );
}
