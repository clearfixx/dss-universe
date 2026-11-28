/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/app/community/forum/new/page.tsx
 *
 * 🎯 Purpose:
 * New topic page after the owner mockups "Створення теми" and "Стани та
 * помилки": the composer, section rules, title tips and section tags.
 *
 * ⚠️ Important:
 * Guests are sent to sign in; read-only members see why they cannot post.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Check, CheckCircle2, Plus, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { loadSessionViewer } from "@/features/auth/session-data";
import {
  loadForumCategories,
  loadForumTags,
  loadViewerSanctionStatus,
} from "@/features/forum/forum-data";
import { ForumReadOnlyNotice } from "@/features/forum/forum-states";
import { ForumTopicComposer } from "@/features/forum/forum-topic-composer";

export const metadata: Metadata = {
  title: "Нова тема | Форум DSS Universe",
};

type Props = { searchParams: Promise<{ forum?: string }> };

const RULES = [
  "Дотримуйтеся тематики розділу.",
  "Шукайте відповідь перед створенням теми.",
  "Використовуйте зрозумілий заголовок.",
  "Поважайте інших учасників.",
];

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-white/[0.07] bg-card p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

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
          trail: [{ href: `/community/forum/${item.id}`, label: item.title }],
          category: category.title,
          categoryId: category.id,
          allowsGatedContent: item.allowsGatedContent,
        },
        ...item.subforums
          .filter((sub) => sub.active)
          .map((sub) => ({
            id: sub.id,
            title: `${item.title} › ${sub.title}`,
            trail: [
              { href: `/community/forum/${item.id}`, label: item.title },
              { href: `/community/forum/${sub.id}`, label: sub.title },
            ],
            category: category.title,
            categoryId: category.id,
            allowsGatedContent: sub.allowsGatedContent,
          })),
      ]),
  );
  const chosen = sections.find((item) => item.id === forum) ?? null;
  const tags = chosen
    ? (await loadForumTags(chosen.id)).filter((tag) => tag.active)
    : [];
  const readOnlyUntil = sanctions?.readOnlyUntil;

  return (
    <DssApplicationShell
      pageTitle={{ pathname: path, title: "Нова тема" }}
      breadcrumbs={[
        { href: "/community", label: "Спільнота" },
        ...(chosen
          ? [
              {
                href: `/community?category=${chosen.categoryId}`,
                label: chosen.category,
              },
              ...chosen.trail,
            ]
          : []),
        { label: "Створити тему" },
      ]}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem] 2xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-4">
          <header className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600/30 text-white">
              <Plus className="size-8" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Створити нову тему
              </h1>
              <p className="mt-0.5 text-sm text-slate-400">
                Поділіться досвідом, поставте запитання або почніть обговорення.
              </p>
            </div>
          </header>

          {readOnlyUntil ? (
            <ForumReadOnlyNotice until={String(readOnlyUntil)}>
              Створювати теми й відповідати поки не можна.
            </ForumReadOnlyNotice>
          ) : sections.length === 0 ? (
            <p className="rounded-xl border border-white/[0.07] bg-card p-4 text-sm text-slate-400">
              Немає розділів, у яких ви можете створити тему.
            </p>
          ) : (
            <ForumTopicComposer
              sections={sections}
              initialForumId={forum ?? null}
            />
          )}
        </div>

        <aside className="min-w-0 space-y-4">
          <Card title="Правила розділу">
            <ul className="space-y-2 text-sm text-slate-300">
              {RULES.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-violet-400"
                    aria-hidden="true"
                  />
                  {rule}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Підказки">
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2.5">
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-emerald-400"
                  aria-hidden="true"
                />
                <span>
                  <span className="block font-medium">Гарний заголовок</span>
                  <span className="text-xs text-slate-400">
                    «Оптимізація білда Next.js 16: практичні поради»
                  </span>
                </span>
              </li>
              <li className="flex gap-2.5">
                <XCircle
                  className="mt-0.5 size-4 shrink-0 text-rose-400"
                  aria-hidden="true"
                />
                <span>
                  <span className="block font-medium">Слабкий заголовок</span>
                  <span className="text-xs text-slate-400">
                    «Проблема з Next.js!!!»
                  </span>
                </span>
              </li>
              <li className="text-xs text-slate-400">
                Для питання додайте версії, код і що вже пробували. Між дописами
                діє пауза 60 секунд.
              </li>
            </ul>
          </Card>
          {chosen && tags.length ? (
            <Card title="Теги у розділі">
              <ul className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <li
                    key={tag.id}
                    className="rounded-md bg-white/[0.05] px-2 py-1 text-xs text-slate-200"
                  >
                    {tag.label}
                  </li>
                ))}
              </ul>
              <Link
                href={`/community/forum/${chosen.id}`}
                className="mt-3 inline-block text-xs text-violet-300 hover:text-violet-200"
              >
                До розділу «{chosen.title}» →
              </Link>
            </Card>
          ) : null}
        </aside>
      </div>
    </DssApplicationShell>
  );
}
