/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/app/command-deck/moderation/appeals/page.tsx
 *
 * 🎯 Purpose:
 * Command Deck › Модерація › Апеляції (`?status=`, `?page=`).
 *
 * ⚠️ Important:
 * Admin area: 404 unless IAM grants Command Deck access; the API also
 * requires moderation.bans.manage.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CommandDeckFrame } from "@/components/command-deck/command-deck-frame";
import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";
import { BanAppealsQueue } from "@/features/command-deck/ban-appeals-queue";
import { loadBanAppeals } from "@/features/command-deck/command-deck-data";
import { ModerationTabs } from "@/features/command-deck/moderation-tabs";
import type { BanAppealStatus } from "@/gql/graphql";

export const metadata: Metadata = { title: "Апеляції | Command Deck" };

const FILTERS: ReadonlyArray<{ status: BanAppealStatus; label: string }> = [
  { status: "PENDING", label: "На розгляді" },
  { status: "ACCEPTED", label: "Ухвалені" },
  { status: "REJECTED", label: "Відхилені" },
];

type Props = {
  searchParams: Promise<{ status?: string; page?: string }>;
};

export default async function BanAppealsPage({ searchParams }: Props) {
  if (!(await loadAdminCommandDeckAccess())) notFound();
  const query = await searchParams;
  const status: BanAppealStatus =
    FILTERS.find((item) => item.status === query.status)?.status ??
    "PENDING";
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const queue = await loadBanAppeals(status, page);
  const pages = Math.max(1, Math.ceil(queue.total / 20));
  const href = (nextStatus: string, nextPage: number) =>
    `/command-deck/moderation/appeals?status=${nextStatus}&page=${nextPage}`;

  return (
    <CommandDeckFrame
      breadcrumbs={[
        { href: "/command-deck", label: "Command Deck" },
        { label: "Модерація" },
        { label: "Апеляції" },
      ]}
    >
      <ModerationTabs active="appeals" />
      <h1 className="text-2xl font-bold">Апеляції</h1>
      <nav aria-label="Стан апеляцій" className="my-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Link
            key={item.status}
            href={href(item.status, 1)}
            aria-current={item.status === status ? "true" : undefined}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              item.status === status
                ? "border-violet-400 text-white"
                : "border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            {item.label}
            {item.status === status ? ` (${queue.total})` : ""}
          </Link>
        ))}
      </nav>
      {queue.items.length ? (
        <BanAppealsQueue appeals={queue.items} />
      ) : (
        <p className="text-sm text-slate-400">Тут поки порожньо.</p>
      )}
      {pages > 1 ? (
        <p className="mt-4 flex gap-3 text-sm">
          {page > 1 ? (
            <Link href={href(status, page - 1)} className="text-violet-300">
              ← Назад
            </Link>
          ) : null}
          <span className="text-slate-400">
            {page} з {pages}
          </span>
          {page < pages ? (
            <Link href={href(status, page + 1)} className="text-violet-300">
              Далі →
            </Link>
          ) : null}
        </p>
      ) : null}
    </CommandDeckFrame>
  );
}
