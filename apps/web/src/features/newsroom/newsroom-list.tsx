import { FilePlus2, PencilLine } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EditorialNewsQuery } from "@/gql/graphql";

type Page = EditorialNewsQuery["editorialNews"];

const statusLabels: Record<string, string> = {
  DRAFT: "Чернетка",
  IN_REVIEW: "На перевірці",
  CHANGES_REQUESTED: "Потрібні зміни",
  APPROVED: "Схвалено",
  SCHEDULED: "Заплановано",
  PUBLISHED: "Опубліковано",
  ARCHIVED: "Архів",
};

export function NewsroomList({ page }: { page: Page }) {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-400">
            Newsroom
          </p>
          <h1 className="mt-2 text-4xl font-semibold">Редакційна станція</h1>
          <p className="mt-2 text-slate-400">
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
              className="group grid gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-5 transition hover:border-cyan-400/35 md:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {statusLabels[item.status] ?? item.status}
                  </Badge>
                  <Badge variant="secondary">{item.postType}</Badge>
                  <span className="text-xs text-slate-500">
                    v{item.currentVersion}
                  </span>
                </div>
                <h2 className="truncate text-lg font-semibold group-hover:text-cyan-200">
                  {item.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                  {item.shortText}
                </p>
              </div>
              <span className="flex items-center gap-2 self-center text-sm text-slate-400">
                <PencilLine className="size-4" /> Відкрити
              </span>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-slate-400">
            Редакційна черга порожня.
          </div>
        )}
      </section>
    </div>
  );
}
