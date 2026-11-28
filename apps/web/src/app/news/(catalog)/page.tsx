import type { Metadata } from "next";

import { DesignScope } from "@/components/ui/design-scope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/choice-fields";
import { Alert } from "@/components/ui/feedback";
import { DssApplicationShell } from "@/components/shell/session-application-shell";
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
      <DesignScope className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-card border border-border bg-card p-5 sm:p-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-medium text-brand-cyan">
              DSS News Signal
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Новини всесвіту розробників
            </h1>
            <p className="max-w-2xl text-base leading-7 sm:text-lg text-muted-foreground">
              Релізи, технології, дослідження й важливі події станції — у
              короткому та повному форматах.
            </p>
          </div>
        </header>

        <form
          className="grid gap-3 rounded-card border border-border bg-card p-4 md:grid-cols-[1fr_12rem_10rem_auto]"
          action="/news"
        >
          <Input
            name="search"
            aria-label="Пошук у новинах"
            defaultValue={params.search}
            placeholder="Пошук у новинах…"
            className="h-10"
          />
          <Input
            name="category"
            aria-label="Категорія"
            defaultValue={params.category}
            placeholder="Категорія"
            className="h-10"
          />
          <NativeSelect
            name="type"
            aria-label="Формат новини"
            defaultValue={postType ?? ""}
            className="h-10"
          >
            <option value="">Усі формати</option>
            {postTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" className="h-10 px-5">
            Знайти
          </Button>
        </form>

        {data ? (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Отримано сигналів</p>
                <p className="text-2xl font-semibold">
                  {data.news.total + data.news.pinnedItems.length}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
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
          <Alert role="alert" variant="warning">Новинний канал тимчасово недоступний.</Alert>
        )}
      </DesignScope>
    </DssApplicationShell>
  );
}
