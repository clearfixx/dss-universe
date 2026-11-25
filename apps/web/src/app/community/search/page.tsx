/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/app/community/search/page.tsx
 *
 * 🎯 Purpose:
 * Community Hub search results (P1 A11, owner mockup «Пошук і підписки»):
 * the shell search lands here; tabs «Теми» and «Новини» with counts,
 * highlighted excerpts and pagination.
 *
 * ⚠️ Important:
 * Visibility is the API's: hidden or unsearchable sections never match.
 * Mockup parts without a search contract (replies, members, tags tabs,
 * section/period filters, relevance sort) are «скоро», never faked.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquareText,
  Search,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import {
  COMMUNITY_SEARCH_MAX_TERM,
  COMMUNITY_SEARCH_PAGE_SIZE,
  loadCommunitySearch,
} from "@/features/forum/forum-data";
import { forumCount, forumWhen } from "@/features/forum/forum-format";
import {
  normalizeSearchTerm,
  searchPage,
  searchSegments,
  searchTab,
  type SearchTab,
} from "@/features/forum/forum-search-model";
import { ForumStatePanel } from "@/features/forum/forum-states";

type Props = {
  searchParams: Promise<{ q?: string; tab?: string; page?: string }>;
};

export const metadata: Metadata = {
  title: "Пошук | Спільнота DSS Universe",
  robots: { index: false },
};

const SOON_TABS = ["Відповіді", "Учасники", "Теги"] as const;

function Excerpt({ text, term }: { text: string; term: string }) {
  return (
    <p className="mt-1 line-clamp-2 text-sm text-slate-400">
      {searchSegments(text, term).map((segment, index) =>
        segment.match ? (
          <mark
            key={index}
            className="rounded bg-primary/25 px-0.5 text-violet-100"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  );
}

export default async function CommunitySearchRoute({ searchParams }: Props) {
  const query = await searchParams;
  const term = normalizeSearchTerm(query.q, COMMUNITY_SEARCH_MAX_TERM);
  const tab = searchTab(query.tab);
  const page = searchPage(query.page);
  const data = term
    ? await loadCommunitySearch(
        term,
        tab === "topics" ? page : 1,
        tab === "news" ? page : 1,
      )
    : null;
  const list = data ? (tab === "topics" ? data.topics : data.news) : null;
  const pages = list
    ? Math.max(1, Math.ceil(list.total / COMMUNITY_SEARCH_PAGE_SIZE))
    : 1;
  const href = (next: { tab?: SearchTab; page?: number }) => {
    const params = new URLSearchParams({ q: term });
    const target = next.tab ?? tab;
    if (target !== "topics") params.set("tab", target);
    if ((next.page ?? 1) > 1) params.set("page", String(next.page));
    return `/community/search?${params.toString()}`;
  };
  const tabs: ReadonlyArray<[SearchTab, string, number | undefined]> = [
    ["topics", "Теми", data?.topics.total],
    ["news", "Новини", data?.news.total],
  ];

  return (
    <DssApplicationShell
      pageTitle={{ pathname: "/community/search", title: "Пошук" }}
      breadcrumbs={[
        { href: "/community", label: "Спільнота" },
        { label: "Пошук" },
      ]}
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {term ? `Результати пошуку: «${term}»` : "Пошук у спільноті"}
          </h1>
          <form
            action="/community/search"
            role="search"
            className="flex flex-wrap gap-2"
          >
            <label className="relative min-w-60 flex-1">
              <span className="sr-only">Що шукаємо</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                name="q"
                defaultValue={term}
                maxLength={COMMUNITY_SEARCH_MAX_TERM}
                placeholder="Теми, новини…"
                className="h-11 w-full rounded-lg border border-white/10 bg-card pr-3 pl-9 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
              />
            </label>
            {tab !== "topics" ? (
              <input type="hidden" name="tab" value={tab} />
            ) : null}
            <button
              type="submit"
              className="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Шукати
            </button>
          </form>
        </header>

        {!term || !data || !list ? (
          <div className="rounded-xl border border-white/[0.07] bg-card">
            <ForumStatePanel icon={<Search />} title="Введіть запит">
              Шукаємо в назвах і текстах тем форуму та в новинах.
            </ForumStatePanel>
          </div>
        ) : (
          <>
            <nav
              aria-label="Тип результатів"
              className="flex overflow-x-auto border-b border-white/[0.07]"
            >
              {tabs.map(([id, label, total]) => (
                <Link
                  key={id}
                  href={href({ tab: id })}
                  aria-current={tab === id ? "page" : undefined}
                  className={`relative inline-flex h-11 shrink-0 items-center gap-2 px-4 text-sm ${
                    tab === id
                      ? "font-semibold text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-violet-500"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {label}
                  <span className="rounded-md bg-white/[0.07] px-1.5 text-xs">
                    {forumCount(total ?? 0)}
                  </span>
                </Link>
              ))}
              {SOON_TABS.map((label) => (
                <span
                  key={label}
                  title="Скоро"
                  aria-disabled="true"
                  className="inline-flex h-11 shrink-0 items-center px-4 text-sm text-slate-500"
                >
                  {label}
                </span>
              ))}
            </nav>

            <p className="text-sm text-slate-400" role="status">
              Знайдено: {forumCount(list.total)}
            </p>

            {list.items.length === 0 ? (
              <div className="rounded-xl border border-white/[0.07] bg-card">
                <ForumStatePanel icon={<Search />} title="Нічого не знайдено">
                  Спробуйте інше формулювання або коротший запит.
                </ForumStatePanel>
              </div>
            ) : (
              <ul className="space-y-3">
                {list.items.map((item) => {
                  const link =
                    tab === "topics"
                      ? `/community/forum/topics/${item.id}`
                      : "slug" in item && "language" in item
                        ? `/news/${item.language}/${item.slug}`
                        : "/news";
                  return (
                    <li
                      key={item.id}
                      className="relative flex gap-3 rounded-xl border border-white/[0.07] bg-card p-4 hover:border-violet-400/40"
                    >
                      <span
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-violet-300"
                        aria-hidden="true"
                      >
                        {tab === "topics" ? (
                          <MessageSquareText className="size-5" />
                        ) : (
                          <FileText className="size-5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={link}
                          className="font-semibold text-white after:absolute after:inset-0 hover:text-violet-200"
                        >
                          {item.title}
                        </Link>
                        <Excerpt text={item.excerpt} term={term} />
                        <span className="mt-1.5 inline-block text-xs text-slate-500">
                          {tab === "topics" ? "Форум" : "Новини"} ·{" "}
                          {forumWhen(item.publishedAt)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {pages > 1 ? (
              <nav
                aria-label="Сторінки"
                className="flex items-center justify-center gap-2"
              >
                {page > 1 ? (
                  <Link
                    href={href({ page: page - 1 })}
                    aria-label="Попередня сторінка"
                    className="flex size-9 items-center justify-center rounded-lg border border-white/10 hover:border-violet-400"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
                <span className="text-sm text-slate-300">
                  Сторінка {page} з {pages}
                </span>
                {page < pages ? (
                  <Link
                    href={href({ page: page + 1 })}
                    aria-label="Наступна сторінка"
                    className="flex size-9 items-center justify-center rounded-lg border border-white/10 hover:border-violet-400"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </>
        )}
      </div>
    </DssApplicationShell>
  );
}
