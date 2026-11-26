"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/components/command-deck/command-deck-shell.tsx
 *
 * 🎯 Purpose:
 * Separate admin shell of Command Deck (owner mockups): fixed sidebar with
 * the admin groups, admin top bar (search, icons, user), breadcrumbs and a
 * mobile drawer. Distinct from the public application shell.
 *
 * ⚠️ Important:
 * Access is decided server-side (app/command-deck/layout.tsx). Entries and
 * top-bar tools without a backend yet are shown disabled with "Скоро".
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Bell,
  ChevronRight,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { logoutAction } from "@/features/auth/auth-actions";
import type { SessionViewer } from "@/features/auth/session-contract";
import { cn } from "@/lib/utils";

import {
  activeCommandDeckHref,
  COMMAND_DECK_GROUPS,
} from "./command-deck-navigation";

export type CommandDeckCrumb = Readonly<{ href?: string; label: string }>;

function DeckLogo() {
  return (
    <Link
      href="/command-deck"
      aria-label="Command Deck — огляд"
      className="flex items-center gap-2.5 text-slate-100"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/dss-logo-mark.svg"
        alt=""
        width={44}
        height={38}
        className="h-[38px] w-11"
      />
      <span className="flex flex-col leading-tight">
        <span className="text-base font-extrabold tracking-[0.12em]">
          DSS UNIVERSE
        </span>
        <span className="text-[10px] font-semibold tracking-[0.3em] text-violet-300">
          COMMAND DECK
        </span>
      </span>
    </Link>
  );
}

function DeckNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = activeCommandDeckHref(pathname);
  return (
    <nav aria-label="Command Deck" className="space-y-4">
      {COMMAND_DECK_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.14em] text-violet-300 uppercase">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.entries.map(({ label, icon: Icon, href }) => (
              <li key={label}>
                {href ? (
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active === href ? "page" : undefined}
                    className={cn(
                      "flex min-h-9 items-center gap-3 rounded-lg px-3 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white",
                      active === href &&
                        "bg-violet-600/25 text-white shadow-[inset_0_0_0_1px_rgba(139,92,246,.45)]",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                    {label}
                  </Link>
                ) : (
                  <a
                    href="#"
                    title="Скоро"
                    aria-disabled="true"
                    onClick={(event) => event.preventDefault()}
                    className="flex min-h-9 cursor-default items-center gap-3 rounded-lg px-3 text-sm text-slate-500"
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                    {label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SoonIcon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span
      role="img"
      aria-label={`${label} — скоро`}
      title={`${label} — скоро`}
      className="flex size-9 items-center justify-center rounded-lg text-slate-500"
    >
      {children}
    </span>
  );
}

export function CommandDeckShell({
  viewer,
  roleLabel,
  breadcrumbs,
  children,
}: {
  viewer: SessionViewer;
  roleLabel: string;
  breadcrumbs: readonly CommandDeckCrumb[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const name = viewer.displayName?.trim() || viewer.username;
  const initials =
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/[0.06] bg-[var(--shell-surface)] lg:flex">
        <div className="px-5 pt-5 pb-4">
          <DeckLogo />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-6">
          <DeckNavigation />
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-[var(--shell-surface)]/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            aria-label="Відкрити меню Command Deck"
            onClick={() => setOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <label className="relative hidden max-w-xl flex-1 md:block">
            <span className="sr-only">Пошук у Command Deck (скоро)</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              disabled
              title="Скоро"
              placeholder="Пошук користувачів, статей, файлів, налаштувань…"
              className="h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] pr-16 pl-9 text-sm placeholder:text-slate-500 disabled:cursor-not-allowed"
            />
            <kbd className="absolute top-1/2 right-2 -translate-y-1/2 rounded border border-white/10 px-1.5 text-[11px] text-slate-500">
              Ctrl K
            </kbd>
          </label>
          <div className="ml-auto flex items-center gap-1">
            <SoonIcon label="Тема оформлення">
              <Sun className="size-5" aria-hidden="true" />
            </SoonIcon>
            <SoonIcon label="Сповіщення">
              <Bell className="size-5" aria-hidden="true" />
            </SoonIcon>
            <SoonIcon label="Повідомлення">
              <MessageSquare className="size-5" aria-hidden="true" />
            </SoonIcon>
            <Link
              href="/settings/profile"
              aria-label="Налаштування профілю"
              className="flex size-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 hover:text-white"
            >
              <Settings className="size-5" aria-hidden="true" />
            </Link>
            <Link
              href={`/profile/${viewer.username}`}
              className="ml-1 flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-white/5"
            >
              {viewer.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewer.avatarUrl}
                  alt=""
                  className="size-9 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-9 items-center justify-center rounded-full bg-primary/25 text-violet-100 text-xs font-bold"
                >
                  {initials}
                </span>
              )}
              <span className="hidden leading-tight sm:block">
                <span className="block text-sm font-semibold">{name}</span>
                <span className="block text-xs text-slate-400">
                  {roleLabel}
                </span>
              </span>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Вийти"
                className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6">
          <nav
            aria-label="Навігаційний шлях"
            className="mb-4 text-sm text-slate-400"
          >
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link
                  href="/command-deck"
                  aria-label="Command Deck"
                  className="flex items-center hover:text-white"
                >
                  <Home className="size-4" aria-hidden="true" />
                </Link>
              </li>
              {breadcrumbs.map((crumb, index) => (
                <li
                  key={`${crumb.label}-${index}`}
                  className="flex items-center gap-1.5"
                >
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                  {crumb.href && index < breadcrumbs.length - 1 ? (
                    <Link href={crumb.href} className="hover:text-white">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={
                        index === breadcrumbs.length - 1
                          ? "font-semibold text-white"
                          : undefined
                      }
                      aria-current={
                        index === breadcrumbs.length - 1 ? "page" : undefined
                      }
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          {children}
        </main>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-72 border-white/10 bg-[var(--shell-surface)] p-0 text-slate-100"
        >
          <SheetTitle className="sr-only">Меню Command Deck</SheetTitle>
          <div className="px-5 pt-5 pb-4">
            <DeckLogo />
          </div>
          <div className="overflow-y-auto px-2 pb-6">
            <DeckNavigation onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
