/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum Moderation
 * 📄 File: apps/web/src/app/community/moderation/page.tsx
 *
 * 🎯 Purpose:
 * Moderator area overview (P1 D7, owner 2026-11-26): moderated sections,
 * trash and sanctions counters, the latest moderator actions, quick links.
 *
 * ⚠️ Important:
 * Access is decided by the API (moderation scope); everyone else gets 404.
 * No own actions here — it summarises and links to trash and sanctions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Gavel,
  History,
  Layers,
  ShieldCheck,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { loadForumModerationOverview } from "@/features/forum/forum-data";
import {
  forumCount,
  forumMemberName,
  forumWhen,
} from "@/features/forum/forum-format";
import {
  moderationActionHref,
  moderationActionLabel,
} from "@/features/moderation/moderation-actions-model";
import { loadStaffSanctions } from "@/features/moderation/sanctions-data";

export const metadata: Metadata = {
  title: "Модерація | Спільнота",
  robots: { index: false },
};

const PATH = "/community/moderation";

export default async function ModerationOverviewRoute() {
  const [overview, sanctions] = await Promise.all([
    loadForumModerationOverview(),
    loadStaffSanctions({
      page: 1,
      subjectId: null,
      kind: null,
      activeOnly: true,
    }).catch(() => "DENIED" as const),
  ]);
  if (overview === "DENIED") notFound();

  const cards: Array<{
    href: string | null;
    label: string;
    value: string;
    hint: string;
    Icon: LucideIcon;
  }> = [
    {
      href: "/community/moderation/trash",
      label: "У кошику",
      value: forumCount(overview.trashCount),
      hint: "теми, які можна відновити",
      Icon: Trash2,
    },
    ...(sanctions === "DENIED"
      ? []
      : [
          {
            href: "/community/moderation/sanctions?active=1",
            label: "Активні санкції",
            value: forumCount(sanctions.total),
            hint: "журнал санкцій",
            Icon: Gavel,
          },
        ]),
    {
      href: null,
      label: "Мої розділи",
      value: overview.allSections
        ? "Усі"
        : forumCount(overview.sections.length),
      hint: overview.allSections
        ? "ви модеруєте весь форум"
        : "розділи під вашою модерацією",
      Icon: Layers,
    },
  ];

  return (
    <DssApplicationShell
      pageTitle={{ pathname: PATH, title: "Модерація" }}
      breadcrumbs={[
        { href: "/community", label: "Спільнота" },
        { label: "Модерація" },
      ]}
    >
      <div className="space-y-5">
        <header className="flex items-center gap-4">
          <span className="hidden size-14 items-center justify-center rounded-2xl bg-primary/25 text-violet-200 sm:flex">
            <ShieldCheck className="size-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Модерація
            </h1>
            <p className="text-sm text-slate-400">
              Огляд розділів, які ви модеруєте: кошик, санкції та останні дії
              модераторів.
            </p>
          </div>
        </header>

        <section
          aria-label="Лічильники"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {cards.map(({ href, label, value, hint, Icon }) => {
            const body = (
              <>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-slate-400">{label}</span>
                  <span className="block text-2xl font-semibold">{value}</span>
                  <span className="block text-xs text-slate-500">{hint}</span>
                </span>
              </>
            );
            const className =
              "flex items-center gap-3 rounded-xl border border-white/[0.08] bg-card p-4";
            return href ? (
              <Link
                key={label}
                href={href}
                className={`${className} transition hover:border-violet-400/40`}
              >
                {body}
              </Link>
            ) : (
              <div key={label} className={className}>
                {body}
              </div>
            );
          })}
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="rounded-xl border border-white/[0.08] bg-card">
            <h2 className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3 text-base font-semibold">
              <History className="size-4 text-violet-300" aria-hidden="true" />
              Останні дії модераторів
            </h2>
            {overview.recentActions.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-400">
                Поки що дій немає.
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {overview.recentActions.map((action) => (
                  <li
                    key={action.id}
                    className="flex flex-col gap-0.5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">
                        {action.actor ? (
                          <Link
                            href={`/profile/${action.actor.username}`}
                            className="text-violet-300 hover:underline"
                          >
                            {forumMemberName(action.actor)}
                          </Link>
                        ) : (
                          forumMemberName(null)
                        )}
                      </span>{" "}
                      <span className="text-slate-300">
                        {moderationActionLabel(action.action)}
                      </span>{" "}
                      <Link
                        href={moderationActionHref(action)}
                        className="break-words text-white hover:underline"
                      >
                        «{action.topicTitle}»
                        {action.postNumber ? ` #${action.postNumber}` : ""}
                      </Link>
                    </span>
                    <time
                      dateTime={String(action.occurredAt)}
                      className="shrink-0 text-xs text-slate-500"
                    >
                      {forumWhen(action.occurredAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="space-y-5">
            <section className="rounded-xl border border-white/[0.08] bg-card p-4">
              <h2 className="mb-3 text-base font-semibold">Мої розділи</h2>
              {overview.allSections ? (
                <p className="text-sm text-slate-400">
                  Ви модеруєте всі розділи форуму.
                </p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {overview.sections.map((section) => (
                    <li key={section.id}>
                      <Link
                        href={`/community/forum/${section.id}`}
                        className="text-slate-200 hover:text-white hover:underline"
                      >
                        {section.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <nav
              aria-label="Швидкі посилання"
              className="rounded-xl border border-white/[0.08] bg-card p-4"
            >
              <h2 className="mb-3 text-base font-semibold">Швидкі посилання</h2>
              <ul className="space-y-1.5 text-sm">
                <li>
                  <Link
                    href="/community/moderation/trash"
                    className="text-slate-200 hover:text-white hover:underline"
                  >
                    Кошик
                  </Link>
                </li>
                {sanctions === "DENIED" ? null : (
                  <li>
                    <Link
                      href="/community/moderation/sanctions"
                      className="text-slate-200 hover:text-white hover:underline"
                    >
                      Журнал санкцій
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </aside>
        </div>
      </div>
    </DssApplicationShell>
  );
}
