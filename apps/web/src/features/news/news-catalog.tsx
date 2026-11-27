"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { EmptyState, EmptyStateDescription } from "@/components/ui/feedback";
import type { NewsBrowseInput, NewsCatalogQuery } from "@/gql/graphql";

import { loadMoreNews } from "./news-actions";
import { NewsCard, type NewsCardItem } from "./news-card";
import { NewsPagination, type NewsPaginationMode } from "./news-pagination";

type Props = {
  initial: NewsCatalogQuery["news"];
  input: NewsBrowseInput;
  mode: NewsPaginationMode;
};

export function NewsCatalog({ initial, input, mode }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<NewsCardItem[]>(initial.items);
  const [activePages, setActivePages] = useState([initial.page]);
  const [pending, startTransition] = useTransition();
  const currentPage = activePages.at(-1) ?? initial.page;

  const goToPage = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(page));
    router.push(`/news?${params.toString()}`);
  };

  const loadMore = () => {
    const nextPage = currentPage + 1;
    startTransition(async () => {
      const result = await loadMoreNews({ ...input, page: nextPage });
      setItems((current) => [...current, ...result.items]);
      setActivePages((current) => [...new Set([...current, nextPage])]);
    });
  };

  return (
    <div className="space-y-8" aria-busy={pending}>
      {initial.pinnedItems.length ? (
        <section className="space-y-4" aria-labelledby="pinned-news-title">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <h2
              id="pinned-news-title"
              className="font-heading text-base font-semibold text-foreground"
            >
              Закріплені сигнали
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {initial.pinnedItems.map((item) => (
              <NewsCard key={`pinned-${item.id}`} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {items.length ? (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState className="py-12">
          <EmptyStateDescription>За цими координатами новин поки немає.</EmptyStateDescription>
        </EmptyState>
      )}

      <NewsPagination
        mode={mode}
        totalPages={initial.totalPages}
        activePages={activePages}
        canLoadMore={!pending && currentPage < initial.totalPages}
        onPageChange={goToPage}
        onLoadMore={loadMore}
        noun="новини"
      />
      {pending ? (
        <p role="status" className="text-center text-sm text-muted-foreground">
          Отримуємо наступний сигнал…
        </p>
      ) : null}
    </div>
  );
}
