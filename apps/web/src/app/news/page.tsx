import type { Metadata } from "next";

import { DssApplicationShell } from "@/components/shell/dss-application-shell";
import { NewsCatalog } from "@/features/news/news-catalog";
import { loadNewsCatalog } from "@/features/news/news-data";
import type { NewsPaginationMode } from "@/features/news/news-pagination";
import type { NewsPostType } from "@/gql/graphql";

export const metadata: Metadata = {
  title: "Новини | DSS Universe",
  description:
    "Новини, релізи та сигнали зі всесвіту розробників DSS Universe.",
};

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
    tag?: string;
    type?: string;
    featured?: string;
  }>;
};

const postTypes: NewsPostType[] = [
  "STANDARD",
  "TEXT",
  "GALLERY",
  "VIDEO",
  "AUDIO",
];

export default async function NewsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const postType = postTypes.includes(params.type as NewsPostType)
    ? (params.type as NewsPostType)
    : undefined;
  const input = {
    page,
    language: "uk",
    search: params.search?.trim() || undefined,
    categorySlug: params.category?.trim() || undefined,
    tagSlug: params.tag?.trim() || undefined,
    postType,
    featured: params.featured === "true" ? true : undefined,
  };
  const data = await loadNewsCatalog(input).catch(() => null);

  return (
    <DssApplicationShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-slate-950/70 px-6 py-10 sm:px-10">
          <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_75%_30%,rgba(34,211,238,.28),transparent_22%),radial-gradient(circle_at_90%_80%,rgba(124,58,237,.25),transparent_30%)]" />
          <div className="relative max-w-3xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[.25em] text-cyan-300">
              DSS News Signal
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Новини всесвіту розробників
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-400">
              Релізи, технології, дослідження й важливі події станції — у
              короткому та повному форматах.
            </p>
          </div>
        </header>

        <form
          className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 md:grid-cols-[1fr_12rem_10rem_auto]"
          action="/news"
        >
          <input
            name="search"
            defaultValue={params.search}
            placeholder="Пошук у новинах…"
            className="h-10 rounded-xl border border-white/10 bg-white/[.04] px-3 outline-none focus:border-cyan-400"
          />
          <input
            name="category"
            defaultValue={params.category}
            placeholder="Категорія"
            className="h-10 rounded-xl border border-white/10 bg-white/[.04] px-3 outline-none focus:border-cyan-400"
          />
          <select
            name="type"
            defaultValue={postType ?? ""}
            className="h-10 rounded-xl border border-white/10 bg-[#080d1c] px-3"
          >
            <option value="">Усі формати</option>
            {postTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button className="h-10 rounded-xl bg-cyan-400 px-5 font-semibold text-slate-950 transition hover:bg-cyan-300">
            Знайти
          </button>
        </form>

        {data ? (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Отримано сигналів</p>
                <p className="text-2xl font-semibold">
                  {data.news.total + data.news.pinnedItems.length}
                </p>
              </div>
              <p className="text-sm text-slate-500">
                Сторінка {data.news.page} з {Math.max(data.news.totalPages, 1)}
              </p>
            </div>
            <NewsCatalog
              initial={data.news}
              input={input}
              mode={
                data.news.total >= data.newsSettings.newsPaginationThreshold
                  ? (data.newsSettings.newsPaginationMode as NewsPaginationMode)
                  : "DISABLED"
              }
            />
          </>
        ) : (
          <div
            role="alert"
            className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-8 text-center text-rose-200"
          >
            Новинний канал тимчасово недоступний.
          </div>
        )}
      </div>
    </DssApplicationShell>
  );
}
