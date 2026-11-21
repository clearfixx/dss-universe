/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/app/community/forum/new/page.tsx
 *
 * 🎯 Purpose:
 * New topic page: the composer, section rules and tips (owner mockups).
 *
 * ⚠️ Important:
 * Guests are sent to sign in; read-only members see why they cannot post.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { CheckCircle2, Lock, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { loadSessionViewer } from "@/features/auth/session-data";
import {
  loadForumCategories,
  loadViewerSanctionStatus,
} from "@/features/forum/forum-data";
import { ForumTopicComposer } from "@/features/forum/forum-topic-composer";

export const metadata: Metadata = {
  title: "Нова тема | Форум DSS Universe",
};

type Props = { searchParams: Promise<{ forum?: string }> };

const dateFormatter = new Intl.DateTimeFormat("uk-UA", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function NewForumTopicRoute({ searchParams }: Props) {
  const { forum } = await searchParams;
  const path = "/community/forum/new";
  const viewer = await loadSessionViewer();
  if (!viewer) {
    redirect(
      `/login?returnTo=${encodeURIComponent(forum ? `${path}?forum=${forum}` : path)}`,
    );
  }
  const [categories, sanctions] = await Promise.all([
    loadForumCategories(),
    loadViewerSanctionStatus(),
  ]);
  const sections = categories.flatMap((category) =>
    category.forums
      .filter((item) => item.active)
      .flatMap((item) => [
        {
          id: item.id,
          title: item.title,
          category: category.title,
          allowsGatedContent: item.allowsGatedContent,
        },
        ...item.subforums
          .filter((sub) => sub.active)
          .map((sub) => ({
            id: sub.id,
            title: `${item.title} › ${sub.title}`,
            category: category.title,
            allowsGatedContent: sub.allowsGatedContent,
          })),
      ]),
  );
  const readOnlyUntil = sanctions?.readOnlyUntil;

  return (
    <DssApplicationShell pageTitle={{ pathname: path, title: "Нова тема" }}>
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <nav
            aria-label="Хлібні крихти"
            className="flex flex-wrap items-center gap-2 text-sm text-slate-400"
          >
            <Link href="/community" className="hover:text-white">
              Спільнота
            </Link>
            <span aria-hidden="true">›</span>
            <span>Форум</span>
            <span aria-hidden="true">›</span>
            <span className="text-slate-200">Створення теми</span>
          </nav>
          <header className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200">
              <PenLine className="size-7" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Створення нової теми
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Поставте запитання або почніть обговорення.
              </p>
            </div>
          </header>

          {readOnlyUntil ? (
            <div
              role="status"
              className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100"
            >
              <Lock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p>
                <strong>Режим «лише читання»</strong> до{" "}
                {dateFormatter.format(new Date(String(readOnlyUntil)))}.
                Створювати теми й відповідати поки не можна.
              </p>
            </div>
          ) : sections.length === 0 ? (
            <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">
              Немає розділів, у яких ви можете створити тему.
            </p>
          ) : (
            <ForumTopicComposer
              sections={sections}
              initialForumId={forum ?? null}
            />
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-[#0f1328] p-5">
            <h2 className="mb-3 font-semibold">Перед публікацією</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              {[
                "Оберіть відповідний розділ.",
                "Вкажіть зрозумілий і короткий заголовок.",
                "Для питання додайте версії, код і що вже пробували.",
                "Використовуйте теги розділу для кращого пошуку.",
              ].map((tip) => (
                <li key={tip} className="flex gap-2">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-emerald-400"
                    aria-hidden="true"
                  />
                  {tip}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-white/10 bg-[#0f1328] p-5 text-sm text-slate-300">
            <h2 className="mb-2 font-semibold text-white">Обмеження</h2>
            <p>Між дописами — пауза 60 секунд (захист від спаму).</p>
            <p className="mt-2">
              Перший допис можна редагувати, доки темі не призначать куратора.
            </p>
          </section>
        </aside>
      </div>
    </DssApplicationShell>
  );
}
