/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/app/command-deck/pages/page.tsx
 *
 * 🎯 Purpose:
 * Command Deck › CMS Builder › Статичні сторінки.
 *
 * ⚠️ Important:
 * Admin area: 404 unless IAM grants Command Deck access; the API also
 * requires cms.pages.manage.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CommandDeckFrame } from "@/components/command-deck/command-deck-frame";
import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";
import { loadStaticPages } from "@/features/command-deck/command-deck-data";
import { formatBanDate } from "@/features/ban/ban-contract";
import { pageStateLabel } from "@/features/static-pages/static-page-model";

export const metadata: Metadata = {
  title: "Статичні сторінки | Command Deck",
};

export default async function StaticPagesList() {
  if (!(await loadAdminCommandDeckAccess())) notFound();
  const pages = await loadStaticPages();

  return (
    <CommandDeckFrame
      breadcrumbs={[
        { href: "/command-deck", label: "Command Deck" },
        { label: "Статичні сторінки" },
      ]}
    >
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Статичні сторінки</h1>
        <Link
          href="/command-deck/pages/new"
          className="ml-auto rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Нова сторінка
        </Link>
      </header>
      <p className="mt-1 mb-4 text-sm text-slate-400">
        Правила, контакти та інші сторінки без змін у коді.
      </p>
      {pages.length ? (
        <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.07] bg-card">
          {pages.map((page) => (
            <li key={page.id}>
              <Link
                href={`/command-deck/pages/${page.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-white/[0.04]"
              >
                <span className="font-semibold">{page.title}</span>
                <span className="text-sm text-slate-400">
                  /pages/{page.slug}
                </span>
                <span className="ml-auto text-xs text-slate-300">
                  {pageStateLabel(page)}
                </span>
                <span className="text-xs text-slate-500">
                  {formatBanDate(page.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">Сторінок ще немає.</p>
      )}
    </CommandDeckFrame>
  );
}
