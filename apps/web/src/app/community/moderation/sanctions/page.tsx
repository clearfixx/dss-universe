/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Moderation
 * 📄 File: apps/web/src/app/community/moderation/sanctions/page.tsx
 *
 * 🎯 Purpose:
 * Staff sanctions journal in the public moderator area (P1 B09, owner
 * decision D7; mockup «Журнал модерації», tab «Санкції»): every warning and
 * read-only restriction, filters by kind, status and member, revoke.
 *
 * ⚠️ Important:
 * Needs moderation.sanctions.view; everyone else gets the ordinary 404.
 * Other journal tabs (topics, posts, users, system) and export have no
 * contract yet and stay «скоро».
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ChevronLeft, ChevronRight, ScrollText, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { forumCount, forumMemberName } from "@/features/forum/forum-format";
import { searchPage } from "@/features/forum/forum-search-model";
import { ForumStatePanel } from "@/features/forum/forum-states";
import {
  SANCTIONS_PAGE_SIZE,
  loadStaffSanctions,
} from "@/features/moderation/sanctions-data";
import { sanctionKind } from "@/features/moderation/sanctions-model";
import { StaffSanctionsTable } from "@/features/moderation/staff-sanctions-table";

type Props = {
  searchParams: Promise<{
    kind?: string;
    active?: string;
    member?: string;
    page?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Журнал санкцій | Модерація",
  robots: { index: false },
};

const PATH = "/community/moderation/sanctions";
const SOON_TABS = ["Теми", "Дописи", "Користувачі", "Система"] as const;

export default async function StaffSanctionsRoute({ searchParams }: Props) {
  const query = await searchParams;
  const kind = sanctionKind(query.kind);
  const activeOnly = query.active === "1";
  const member =
    typeof query.member === "string" && /^[0-9a-f-]{36}$/i.test(query.member)
      ? query.member
      : null;
  const page = searchPage(query.page);
  const journal = await loadStaffSanctions({
    page,
    subjectId: member,
    kind,
    activeOnly,
  });
  if (journal === "DENIED") notFound();

  const pages = Math.max(1, Math.ceil(journal.total / SANCTIONS_PAGE_SIZE));
  const href = (next: {
    kind?: string | null;
    active?: boolean;
    member?: string | null;
    page?: number;
  }) => {
    const params = new URLSearchParams();
    const k = next.kind === undefined ? kind : next.kind;
    const a = next.active ?? activeOnly;
    const m = next.member === undefined ? member : next.member;
    if (k) params.set("kind", k);
    if (a) params.set("active", "1");
    if (m) params.set("member", m);
    if ((next.page ?? 1) > 1) params.set("page", String(next.page));
    const value = params.toString();
    return value ? `${PATH}?${value}` : PATH;
  };
  const memberName = member
    ? journal.items.find((item) => item.subjectId === member)?.subject
    : null;
  const pill = (active: boolean) =>
    `inline-flex h-9 items-center rounded-lg border px-3 text-sm ${
      active
        ? "border-violet-500 bg-primary/20 font-semibold text-white"
        : "border-white/10 text-slate-300 hover:border-violet-400/60"
    }`;

  return (
    <DssApplicationShell
      pageTitle={{ pathname: PATH, title: "Журнал санкцій" }}
      breadcrumbs={[
        { href: "/community", label: "Спільнота" },
        { label: "Модерація" },
        { label: "Журнал санкцій" },
      ]}
    >
      <div className="space-y-5">
        <header className="flex items-center gap-4">
          <span className="hidden size-14 items-center justify-center rounded-2xl bg-primary/25 text-violet-200 sm:flex">
            <ScrollText className="size-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Журнал санкцій
            </h1>
            <p className="text-sm text-slate-400">
              Попередження та режим «Лише читання» для учасників спільноти.
              Видно лише персоналу.
            </p>
          </div>
        </header>

        <nav
          aria-label="Журнал модерації"
          className="flex overflow-x-auto border-b border-white/[0.07]"
        >
          <span
            aria-current="page"
            className="relative inline-flex h-11 shrink-0 items-center gap-2 px-4 text-sm font-semibold text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-violet-500"
          >
            Санкції
            <span className="rounded-md bg-white/[0.07] px-1.5 text-xs">
              {forumCount(journal.total)}
            </span>
          </span>
          {SOON_TABS.map((label) => (
            <span
              key={label}
              title="Скоро"
              aria-disabled="true"
              className="inline-flex h-11 shrink-0 items-center px-4 text-sm text-slate-500"
            >
              {label}
            </span>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={href({ kind: null, page: 1 })} className={pill(!kind)}>
            Усі дії
          </Link>
          <Link
            href={href({ kind: "WARNING", page: 1 })}
            className={pill(kind === "WARNING")}
          >
            Попередження
          </Link>
          <Link
            href={href({ kind: "READ_ONLY", page: 1 })}
            className={pill(kind === "READ_ONLY")}
          >
            Лише читання
          </Link>
          <Link
            href={href({ active: !activeOnly, page: 1 })}
            aria-pressed={activeOnly}
            className={`${pill(activeOnly)} sm:ml-auto`}
          >
            Лише активні
          </Link>
          {member ? (
            <Link
              href={href({ member: null, page: 1 })}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 text-sm text-slate-200 hover:bg-white/[0.1]"
            >
              Учасник: {memberName ? forumMemberName(memberName) : "вибраний"}
              <X className="size-3.5" aria-label="Прибрати фільтр" />
            </Link>
          ) : null}
        </div>

        {journal.items.length === 0 ? (
          <div className="rounded-xl border border-white/[0.07] bg-card">
            <ForumStatePanel icon={<ScrollText />} title="Записів немає">
              {kind || activeOnly || member
                ? "Змініть фільтри, щоб побачити інші санкції."
                : "Тут з’являться попередження та обмеження, видані модераторами."}
            </ForumStatePanel>
          </div>
        ) : (
          <StaffSanctionsTable
            items={journal.items}
            memberHrefs={Object.fromEntries(
              journal.items.map((item) => [
                item.subjectId,
                href({ member: item.subjectId, page: 1 }),
              ]),
            )}
          />
        )}

        {pages > 1 ? (
          <nav
            aria-label="Сторінки"
            className="flex items-center justify-center gap-2"
          >
            {page > 1 ? (
              <Link
                href={href({ page: page - 1 })}
                aria-label="Попередня сторінка"
                className="flex size-9 items-center justify-center rounded-lg border border-white/10 hover:border-violet-400"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
            <span className="text-sm text-slate-300">
              Сторінка {page} з {pages}
            </span>
            {page < pages ? (
              <Link
                href={href({ page: page + 1 })}
                aria-label="Наступна сторінка"
                className="flex size-9 items-center justify-center rounded-lg border border-white/10 hover:border-violet-400"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </DssApplicationShell>
  );
}
