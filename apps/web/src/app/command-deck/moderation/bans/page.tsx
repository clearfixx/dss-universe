/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/app/command-deck/moderation/bans/page.tsx
 *
 * 🎯 Purpose:
 * Command Deck › Модерація › Чинні бани (`?page=`).
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
import { ActiveBansList } from "@/features/command-deck/active-bans-list";
import { loadActiveBans } from "@/features/command-deck/command-deck-data";
import { ModerationTabs } from "@/features/command-deck/moderation-tabs";

export const metadata: Metadata = { title: "Чинні бани | Command Deck" };

type Props = { searchParams: Promise<{ page?: string }> };

export default async function ActiveBansPage({ searchParams }: Props) {
  if (!(await loadAdminCommandDeckAccess())) notFound();
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const list = await loadActiveBans(page);
  const pages = Math.max(1, Math.ceil(list.total / 20));

  return (
    <CommandDeckFrame
      breadcrumbs={[
        { href: "/command-deck", label: "Command Deck" },
        { label: "Модерація" },
        { label: "Чинні бани" },
      ]}
    >
      <ModerationTabs active="bans" />
      <h1 className="text-2xl font-bold">Чинні бани ({list.total})</h1>
      <p className="mt-1 mb-4 text-sm text-slate-400">
        Видати бан можна з меню ⋯ допису на форумі.
      </p>
      {list.items.length ? (
        <ActiveBansList bans={list.items} />
      ) : (
        <p className="text-sm text-slate-400">Чинних банів немає.</p>
      )}
      {pages > 1 ? (
        <p className="mt-4 flex gap-3 text-sm">
          {page > 1 ? (
            <Link
              href={`/command-deck/moderation/bans?page=${page - 1}`}
              className="text-violet-300"
            >
              ← Назад
            </Link>
          ) : null}
          <span className="text-slate-400">
            {page} з {pages}
          </span>
          {page < pages ? (
            <Link
              href={`/command-deck/moderation/bans?page=${page + 1}`}
              className="text-violet-300"
            >
              Далі →
            </Link>
          ) : null}
        </p>
      ) : null}
    </CommandDeckFrame>
  );
}
