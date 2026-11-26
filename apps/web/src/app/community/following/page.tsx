/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/app/community/following/page.tsx
 *
 * 🎯 Purpose:
 * «Мої підписки» (P1 A10, owner mockup «Пошук і підписки»): topics the
 * viewer follows and new topics from followed sections, newest first.
 *
 * ⚠️ Important:
 * Signed-in only (guests go to login). Lists come from viewerForumTopics,
 * which already drops topics the viewer can no longer see. Tag
 * subscriptions have no API yet and stay «скоро».
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BellRing, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { loadSessionViewer } from "@/features/auth/session-data";
import {
  FORUM_PAGE_SIZE,
  loadViewerForumTopics,
} from "@/features/forum/forum-data";
import { forumCount } from "@/features/forum/forum-format";
import { searchPage } from "@/features/forum/forum-search-model";
import { ForumStatePanel } from "@/features/forum/forum-states";
import { ForumTopicRow } from "@/features/forum/forum-topic-row";
import type { ForumViewerCollection } from "@/gql/graphql";

type Props = {
  searchParams: Promise<{ tab?: string; page?: string }>;
};

export const metadata: Metadata = {
  title: "Мої підписки | Спільнота DSS Universe",
};

type FollowTab = "topics" | "sections";

const TABS: ReadonlyArray<{
  id: FollowTab;
  label: string;
  collection: ForumViewerCollection;
  empty: string;
}> = [
  {
    id: "topics",
    label: "Теми",
    collection: "SUBSCRIBED",
    empty:
      "Ви ще не стежите за жодною темою. Натисніть «Стежити» на сторінці теми — нові відповіді з’являться тут.",
  },
  {
    id: "sections",
    label: "Розділи",
    collection: "FOLLOWED_SECTIONS",
    empty:
      "Тут з’являться нові теми з розділів, за якими ви стежите. Натисніть «Стежити» на сторінці розділу.",
  },
];

const PATH = "/community/following";

export default async function CommunityFollowingRoute({ searchParams }: Props) {
  const query = await searchParams;
  const tab = TABS.find((item) => item.id === query.tab) ?? TABS[0];
  const page = searchPage(query.page);
  const self = tab.id === "topics" ? PATH : `${PATH}?tab=${tab.id}`;
  const viewer = await loadSessionViewer();
  if (!viewer) redirect(`/login?returnTo=${encodeURIComponent(self)}`);

  const [current, other] = await Promise.all([
    loadViewerForumTopics(tab.collection, page),
    loadViewerForumTopics(
      TABS.find((item) => item.id !== tab.id)!.collection,
      1,
    ),
  ]);
  const totals: Record<FollowTab, number> = {
    topics: tab.id === "topics" ? (current?.total ?? 0) : (other?.total ?? 0),
    sections:
      tab.id === "sections" ? (current?.total ?? 0) : (other?.total ?? 0),
  };
  const items = current?.items ?? [];
  const pages = Math.max(1, Math.ceil((current?.total ?? 0) / FORUM_PAGE_SIZE));
  const href = (id: FollowTab, target = 1) => {
    const params = new URLSearchParams();
    if (id !== "topics") params.set("tab", id);
    if (target > 1) params.set("page", String(target));
    const search = params.toString();
    return search ? `${PATH}?${search}` : PATH;
  };

  return (
    <DssApplicationShell
      pageTitle={{ pathname: PATH, title: "Мої підписки" }}
      breadcrumbs={[
        { href: "/community", label: "Спільнота" },
        { label: "Мої підписки" },
      ]}
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex items-center gap-4">
          <span className="hidden size-14 items-center justify-center rounded-2xl bg-primary/25 text-violet-200 sm:flex">
            <BellRing className="size-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Мої підписки
            </h1>
            <p className="text-sm text-slate-400">
              Теми, за якими ви стежите, і нове в розділах, на які ви підписані.
            </p>
          </div>
        </header>

        <nav
          aria-label="Підписки"
          className="flex overflow-x-auto border-b border-white/[0.07]"
        >
          {TABS.map((item) => (
            <Link
              key={item.id}
              href={href(item.id)}
              aria-current={item.id === tab.id ? "page" : undefined}
              className={`relative inline-flex h-11 shrink-0 items-center gap-2 px-4 text-sm ${
                item.id === tab.id
                  ? "font-semibold text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-violet-500"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {item.label}
              <span className="rounded-md bg-white/[0.07] px-1.5 text-xs">
                {forumCount(totals[item.id])}
              </span>
            </Link>
          ))}
          <span
            title="Скоро"
            aria-disabled="true"
            className="inline-flex h-11 shrink-0 items-center px-4 text-sm text-slate-500"
          >
            Теги
          </span>
        </nav>

        <section
          aria-label={tab.label}
          className="overflow-hidden rounded-xl border border-white/[0.07] bg-card"
        >
          {items.length === 0 ? (
            <ForumStatePanel icon={<BellRing />} title="Поки що порожньо">
              {tab.empty}
            </ForumStatePanel>
          ) : (
            <ul>
              {items.map((topic) => (
                <ForumTopicRow key={topic.id} topic={topic} />
              ))}
            </ul>
          )}
        </section>

        {pages > 1 ? (
          <nav
            aria-label="Сторінки"
            className="flex items-center justify-center gap-2"
          >
            {page > 1 ? (
              <Link
                href={href(tab.id, page - 1)}
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
                href={href(tab.id, page + 1)}
                aria-label="Наступна сторінка"
                className="flex size-9 items-center justify-center rounded-lg border border-white/10 hover:border-violet-400"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </DssApplicationShell>
  );
}
