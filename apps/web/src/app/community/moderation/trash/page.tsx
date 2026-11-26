/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/app/community/moderation/trash/page.tsx
 *
 * 🎯 Purpose:
 * Forum trash in the public moderator area (P1 B07, owner decision D7;
 * mockups «Кошик» / «Потік остаточного видалення»): trashed topics of the
 * sections the viewer moderates, search, section filter and restore.
 *
 * ⚠️ Important:
 * Members and guests get the ordinary 404. Posts tab, purged log, reasons
 * and retention have no contract yet and stay «скоро»; permanent deletion
 * waits for the owner's purge policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ChevronLeft, ChevronRight, Search, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import {
  FORUM_PAGE_SIZE,
  loadForumCategories,
  loadForumTrash,
} from "@/features/forum/forum-data";
import { forumCount } from "@/features/forum/forum-format";
import {
  normalizeSearchTerm,
  searchPage,
} from "@/features/forum/forum-search-model";
import { ForumStatePanel } from "@/features/forum/forum-states";
import { ForumTrashTable } from "@/features/forum/forum-trash-table";

type Props = {
  searchParams: Promise<{ q?: string; forum?: string; page?: string }>;
};

export const metadata: Metadata = {
  title: "Кошик | Модерація форуму",
  robots: { index: false },
};

const PATH = "/community/moderation/trash";

export default async function ForumTrashRoute({ searchParams }: Props) {
  const query = await searchParams;
  const search = normalizeSearchTerm(query.q);
  const forumId =
    typeof query.forum === "string" && query.forum ? query.forum : null;
  const page = searchPage(query.page);
  const [trash, categories] = await Promise.all([
    loadForumTrash({ page, forumId, search: search || null }),
    loadForumCategories(),
  ]);
  if (trash === "DENIED") notFound();

  const sections: Record<string, string> = {};
  const options: Array<{ id: string; label: string }> = [];
  for (const category of categories) {
    for (const forum of category.forums) {
      sections[forum.id] = forum.title;
      options.push({ id: forum.id, label: forum.title });
      for (const sub of forum.subforums) {
        sections[sub.id] = sub.title;
        options.push({ id: sub.id, label: `${forum.title} › ${sub.title}` });
      }
    }
  }
  const list = trash === "OUT_OF_SCOPE" ? null : trash;
  const pages = list ? Math.max(1, Math.ceil(list.total / FORUM_PAGE_SIZE)) : 1;
  const href = (target: number) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (forumId) params.set("forum", forumId);
    if (target > 1) params.set("page", String(target));
    const value = params.toString();
    return value ? `${PATH}?${value}` : PATH;
  };
  const filtered = Boolean(search || forumId);

  return (
    <DssApplicationShell
      pageTitle={{ pathname: PATH, title: "Кошик" }}
      breadcrumbs={[
        { href: "/community", label: "Спільнота" },
        { label: "Модерація" },
        { label: "Кошик" },
      ]}
    >
      <div className="space-y-5">
        <header className="flex items-center gap-4">
          <span className="hidden size-14 items-center justify-center rounded-2xl bg-primary/25 text-violet-200 sm:flex">
            <Trash2 className="size-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Кошик
            </h1>
            <p className="text-sm text-slate-400">
              Видалені теми розділів, які ви модеруєте. Їх можна відновити.
            </p>
          </div>
        </header>

        <nav
          aria-label="Кошик"
          className="flex overflow-x-auto border-b border-white/[0.07]"
        >
          <span
            aria-current="page"
            className="relative inline-flex h-11 shrink-0 items-center gap-2 px-4 text-sm font-semibold text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-violet-500"
          >
            Теми
            <span className="rounded-md bg-white/[0.07] px-1.5 text-xs">
              {forumCount(list?.total ?? 0)}
            </span>
          </span>
          {["Дописи", "Очищено"].map((label) => (
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

        <form
          action={PATH}
          role="search"
          className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_16rem_auto]"
        >
          <label className="relative">
            <span className="sr-only">Пошук у кошику</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              name="q"
              defaultValue={search}
              maxLength={100}
              placeholder="Пошук у кошику…"
              className="h-10 w-full rounded-lg border border-white/10 bg-card pr-3 pl-9 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
            />
          </label>
          <label>
            <span className="sr-only">Розділ</span>
            <select
              name="forum"
              defaultValue={forumId ?? ""}
              className="h-10 w-full rounded-lg border border-white/10 bg-card px-3 text-sm text-white focus:border-violet-400 focus:outline-none"
            >
              <option value="">Усі розділи</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Застосувати
          </button>
        </form>

        {!list ? (
          <div className="rounded-xl border border-white/[0.07] bg-card">
            <ForumStatePanel icon={<Trash2 />} title="Немає доступу до розділу">
              Ви не модеруєте цей розділ. Оберіть інший або «Усі розділи».
            </ForumStatePanel>
          </div>
        ) : list.items.length === 0 ? (
          <div className="rounded-xl border border-white/[0.07] bg-card">
            <ForumStatePanel
              icon={<Trash2 />}
              title={filtered ? "Нічого не знайдено" : "Кошик порожній"}
            >
              {filtered
                ? "Змініть пошук або розділ."
                : "Видалені теми ваших розділів з’являться тут."}
            </ForumStatePanel>
          </div>
        ) : (
          <ForumTrashTable items={list.items} sections={sections} />
        )}

        {list && pages > 1 ? (
          <nav
            aria-label="Сторінки"
            className="flex items-center justify-center gap-2"
          >
            {page > 1 ? (
              <Link
                href={href(page - 1)}
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
                href={href(page + 1)}
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
