import { FilePlus2, PencilLine } from "lucide-react";
import Link from "next/link";

import { DesignScope } from "@/components/ui/design-scope";
import { EmptyState, EmptyStateTitle, EmptyStateDescription } from "@/components/ui/feedback";
import { editorialStatus } from "./editorial-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EditorialNewsQuery } from "@/gql/graphql";

type Page = EditorialNewsQuery["editorialNews"];


export function NewsroomList({ page }: { page: Page }) {
  return (
    <DesignScope className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-brand-cyan">
            Newsroom
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold sm:text-4xl">Редакційна станція</h1>
          <p className="mt-2 text-muted-foreground">
            Чернетки, модерація та публікація в одному потоці.
          </p>
        </div>
        <Button asChild>
          <Link href="/newsroom/new">
            <FilePlus2 /> Нова новина
          </Link>
        </Button>
      </header>
      <section className="grid gap-3">
        {page.items.length ? (
          page.items.map((item) => (
            <Link
              key={item.id}
              href={`/newsroom/${item.id}`}
              className="group grid gap-3 rounded-card border border-border bg-card p-4 transition-colors hover:border-ring focus-visible:outline-2 focus-visible:outline-ring md:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant={editorialStatus(item.status).variant}>
                    {editorialStatus(item.status).label}
                  </Badge>
                  <Badge variant="secondary">{item.postType}</Badge>
                  <span className="text-xs text-muted-foreground">
                    v{item.currentVersion}
                  </span>
                </div>
                <h2 className="break-words font-heading text-xl font-semibold group-hover:text-link">
                  {item.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {item.shortText}
                </p>
              </div>
              <span className="flex items-center gap-2 self-center text-sm text-muted-foreground">
                <PencilLine className="size-4" /> Відкрити
              </span>
            </Link>
          ))
        ) : (
          <EmptyState className="py-10">
            <EmptyStateTitle>Редакційна черга порожня.</EmptyStateTitle>
            <EmptyStateDescription>Створіть новину, щоб почати роботу.</EmptyStateDescription>
            <Button asChild variant="outline"><Link href="/newsroom/new">Створити новину</Link></Button>
          </EmptyState>
        )}
      </section>
    </DesignScope>
  );
}
