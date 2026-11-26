"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-news-link-dialog.tsx
 *
 * 🎯 Purpose:
 * «Прив'язка обговорення» dialog on a news article (P1 A12): search an
 * existing topic or paste its link, link it, or unlink the current one.
 *
 * ⚠️ Important:
 * Shown to the article author and administrators; the API re-checks
 * (author or category moderator) and reports refusals here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Link2, MessageSquareText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { topicIdFrom } from "./forum-action-dialog";
import {
  findForumTopics,
  linkNewsDiscussion,
  unlinkNewsDiscussion,
} from "./forum-news-actions";

export function ForumNewsLinkDialog({
  articleId,
  articlePath,
  linked,
}: {
  articleId: string;
  articlePath: string;
  linked: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [found, setFound] = useState<
    ReadonlyArray<{ id: string; title: string }>
  >([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function search() {
    setError(null);
    const pasted = topicIdFrom(term);
    if (/^[0-9a-f-]{36}$/i.test(pasted)) {
      setChosen(pasted);
      setFound([{ id: pasted, title: "Тема за посиланням" }]);
      return;
    }
    start(async () => {
      const result = await findForumTopics(term);
      if (!result.ok) return setError(result.error.message);
      setFound(result.data);
      setChosen(result.data[0]?.id ?? null);
      if (result.data.length === 0) setError("Тем за цим запитом не знайдено.");
    });
  }

  function save() {
    if (!chosen) return;
    setError(null);
    start(async () => {
      const result = await linkNewsDiscussion(articleId, chosen, articlePath);
      if (!result.ok) return setError(result.error.message);
      setOpen(false);
      router.refresh();
    });
  }

  function unlink() {
    setError(null);
    start(async () => {
      const result = await unlinkNewsDiscussion(articleId, articlePath);
      if (!result.ok) return setError(result.error.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-medium text-white hover:border-violet-400"
      >
        <Link2 className="size-4" aria-hidden="true" />
        {linked ? "Змінити прив’язку" : "Прив’язати обговорення"}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Прив’язка обговорення</DialogTitle>
            <DialogDescription>
              Оберіть тему форуму — вона з’явиться у блоці «Обговорення на
              форумі» під новиною.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              search();
            }}
          >
            <label className="relative flex-1">
              <span className="sr-only">Пошук теми</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Назва теми або посилання на неї"
                className="h-10 w-full rounded-lg border border-white/10 bg-background pr-3 pl-9 text-sm text-white focus:border-violet-400 focus:outline-none"
              />
            </label>
            <Button type="submit" variant="outline" disabled={pending}>
              Знайти
            </Button>
          </form>
          {found.length ? (
            <ul
              role="listbox"
              aria-label="Знайдені теми"
              className="space-y-1.5"
            >
              {found.map((topic) => (
                <li key={topic.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={chosen === topic.id}
                    onClick={() => setChosen(topic.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm",
                      chosen === topic.id
                        ? "border-violet-500 bg-primary/15 text-white"
                        : "border-white/10 text-slate-200 hover:border-violet-400/50",
                    )}
                  >
                    <MessageSquareText
                      className="size-4 shrink-0 text-violet-300"
                      aria-hidden="true"
                    />
                    <span className="truncate">{topic.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-3">
            <Button type="button" disabled={!chosen || pending} onClick={save}>
              Зберегти
            </Button>
            {linked ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={unlink}
              >
                Відв’язати
              </Button>
            ) : null}
            <Link
              href="/community/forum/new"
              className="ml-auto inline-flex items-center gap-1.5 text-sm text-violet-300 hover:text-violet-200"
            >
              <Plus className="size-4" aria-hidden="true" />
              Створити тему
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
