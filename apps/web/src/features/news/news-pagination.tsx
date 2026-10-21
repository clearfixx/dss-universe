"use client";

import { FormEvent, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type NewsPaginationMode = "DISABLED" | "PAGES" | "LOAD_MORE" | "BOTH";

type NewsPaginationProps = {
  mode: NewsPaginationMode;
  totalPages: number;
  activePages: number[];
  canLoadMore: boolean;
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
  noun?: string;
};

export function NewsPagination({
  mode,
  totalPages,
  activePages,
  canLoadMore,
  onPageChange,
  onLoadMore,
  noun = "сторінку",
}: NewsPaginationProps) {
  const normalizedActive = useMemo(
    () =>
      [...new Set(activePages)]
        .filter((page) => page >= 1 && page <= totalPages)
        .sort((left, right) => left - right),
    [activePages, totalPages],
  );
  const currentPage = normalizedActive.at(-1) ?? 1;
  const [manualPage, setManualPage] = useState(String(currentPage));
  const showPages = mode === "PAGES" || mode === "BOTH";
  const showLoadMore = mode === "LOAD_MORE" || mode === "BOTH";
  const pageItems = useMemo(
    () => paginationItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  if (mode === "DISABLED" || totalPages <= 1) return null;

  const go = (page: number) => {
    const bounded = Math.min(Math.max(Math.trunc(page), 1), totalPages);
    setManualPage(String(bounded));
    onPageChange(bounded);
  };

  const submitManual = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number(manualPage);
    if (Number.isFinite(parsed)) go(parsed);
  };

  return (
    <nav aria-label={`Навігація: ${noun}`} className="grid gap-3">
      {showLoadMore && canLoadMore ? (
        <Button type="button" variant="outline" onClick={onLoadMore}>
          Завантажити ще
        </Button>
      ) : null}

      {showPages ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => go(currentPage - 1)}
          >
            <ChevronLeft aria-hidden="true" /> Назад
          </Button>

          <div
            className="flex flex-wrap items-center gap-1"
            aria-label="Сторінки"
          >
            {pageItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  aria-hidden="true"
                  className="px-1"
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={`Сторінка ${item}`}
                  aria-current={item === currentPage ? "page" : undefined}
                  data-active={normalizedActive.includes(item) || undefined}
                  className={cn(
                    normalizedActive.includes(item) &&
                      "border-primary bg-primary/15 text-primary",
                  )}
                  onClick={() => go(item)}
                >
                  {item}
                </Button>
              ),
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => go(currentPage + 1)}
          >
            Вперед <ChevronRight aria-hidden="true" />
          </Button>

          <label className="ml-auto flex items-center gap-2 text-sm">
            Перейти до
            <select
              aria-label="Вибрати сторінку"
              value={currentPage}
              onChange={(event) => go(Number(event.target.value))}
              className="h-8 rounded-lg border border-input bg-background px-2"
            >
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (page) => (
                  <option key={page} value={page}>
                    {page}
                  </option>
                ),
              )}
            </select>
          </label>

          <form onSubmit={submitManual} className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={manualPage}
              aria-label="Номер сторінки"
              className="w-20"
              onChange={(event) => setManualPage(event.target.value)}
            />
            <Button type="submit" variant="secondary">
              Перейти
            </Button>
          </form>
        </div>
      ) : null}
    </nav>
  );
}

export function paginationItems(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set([1, totalPages]);
  for (
    let page = Math.max(2, currentPage - 1);
    page <= Math.min(totalPages - 1, currentPage + 1);
    page += 1
  ) {
    pages.add(page);
  }
  const sorted = [...pages].sort((left, right) => left - right);
  const items: Array<number | "ellipsis"> = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) items.push("ellipsis");
    items.push(page);
  });
  return items;
}
