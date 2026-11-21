"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Shell
 * 📄 File: apps/web/src/components/shell/dss-application-shell.tsx
 *
 * 🎯 Purpose:
 * Application shell in the owner's mockup layout: a fixed left sidebar
 * (logo, modules, the active module's sections), a top bar with module tabs,
 * search and the user menu, and violet breadcrumbs with a home icon.
 *
 * ⚠️ Important:
 * Navigation stays a presentation contract (shell-navigation.ts); server
 * guards remain authoritative. Route owners may pass a deeper, trusted
 * breadcrumb trail (e.g. forum category › section › topic).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  ChevronDown,
  ChevronRight,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type PropsWithChildren, type ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { logoutAction } from "@/features/auth/auth-actions";
import type { SessionViewer } from "@/features/auth/session-contract";
import { cn } from "@/lib/utils";

import { viewerDisplayName } from "./personal-hub-presentation";
import { isDrawerOpenForPath } from "./shell-drawer-state";

import {
  DEFAULT_SHELL_VARIANT,
  visibleModules,
  breadcrumbsForPath,
  currentModule,
  currentSidebarHref,
  moduleSidebarItems,
  navigationCurrent,
  routeMatches,
  type ShellVariant,
  type TrustedPageTitle,
} from "./shell-navigation";

/** A route-owned breadcrumb trail; the last item is the current page. */
export type TrustedBreadcrumb = Readonly<{ href?: string; label: string }>;

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="DSS Universe — головна"
      className="flex shrink-0 items-center gap-2.5 text-slate-100"
    >
      <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
        <circle cx="20" cy="20" r="10.5" fill="none" stroke="#ece9ff" strokeWidth="4" />
        <ellipse
          cx="20"
          cy="20"
          rx="18.5"
          ry="6.5"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="2.5"
          transform="rotate(-22 20 20)"
        />
      </svg>
      {compact ? null : (
        <span aria-hidden="true" className="flex flex-col leading-none">
          <span className="text-lg font-extrabold tracking-[0.06em]">DSS</span>
          <span className="text-[10px] font-semibold tracking-[0.28em] text-slate-300">
            UNIVERSE
          </span>
        </span>
      )}
    </Link>
  );
}

/** Left sidebar: every module, the active one expanded with its sections. */
function SidebarNavigation({
  pathname,
  hasSession,
  canAccessAdminDeck,
  onNavigate,
}: {
  pathname: string;
  hasSession: boolean;
  canAccessAdminDeck: boolean;
  onNavigate?: () => void;
}) {
  const active = currentModule(pathname);
  const sections = moduleSidebarItems(pathname);
  const currentHref = currentSidebarHref(pathname);
  return (
    <nav aria-label="Модулі DSS Universe" className="space-y-1">
      {visibleModules(hasSession, canAccessAdminDeck).map((module) => {
        const Icon = module.icon;
        const expanded = active?.href === module.href && sections.length > 1;
        return (
          <div key={module.href}>
            <Link
              href={module.href}
              aria-current={navigationCurrent(pathname, module.href)}
              onClick={onNavigate}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400",
                active?.href === module.href &&
                  "bg-violet-600/20 text-white shadow-[inset_0_0_0_1px_rgba(139,92,246,.45)]",
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              <span className="flex-1">{module.label}</span>
              {expanded ? (
                <ChevronDown className="size-4 text-slate-400" aria-hidden="true" />
              ) : null}
            </Link>
            {expanded ? (
              <ul aria-label={`Розділи: ${module.label}`} className="mt-1 space-y-0.5 pl-4">
                {sections.map(({ href, label, icon: SectionIcon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={
                        currentHref === href ? navigationCurrent(pathname, href) : undefined
                      }
                      className={cn(
                        "flex min-h-9 items-center gap-3 rounded-lg px-3 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white",
                        currentHref === href && "bg-violet-500/15 text-violet-100",
                      )}
                    >
                      <SectionIcon className="size-4 shrink-0" aria-hidden="true" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export function GlobalNavigation({
  pathname,
  variant,
  hasSession,
  canAccessAdminDeck,
  onOpenLauncher,
  launcherOpen = false,
}: {
  pathname: string;
  variant: ShellVariant;
  hasSession: boolean;
  canAccessAdminDeck: boolean;
  onOpenLauncher: () => void;
  launcherOpen?: boolean;
}) {
  const modules = visibleModules(hasSession, canAccessAdminDeck);
  const featured = modules.filter((item) => item.featured);
  const inline = variant === "HORIZONTAL_NAVIGATION" ? modules : featured;

  return (
    <div className="hidden min-w-0 items-stretch gap-1 self-stretch lg:flex">
      {variant !== "MODULE_LAUNCHER" && (
        <nav aria-label="Глобальна навігація" className="flex min-w-0 items-stretch gap-1">
          {inline.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={label}
              aria-current={navigationCurrent(pathname, href)}
              className={cn(
                "inline-flex shrink-0 items-center border-b-2 border-transparent px-3 text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400",
                routeMatches(pathname, href) && "border-violet-500 text-violet-200",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onOpenLauncher}
        aria-haspopup="dialog"
        aria-expanded={launcherOpen}
        className="self-center text-slate-300"
      >
        <Menu aria-hidden="true" />
        {variant === "MODULE_LAUNCHER" ? "Модулі" : "Усі модулі"}
        <ChevronDown aria-hidden="true" className="size-3" />
      </Button>
    </div>
  );
}

export function Breadcrumbs({
  pathname,
  pageTitle,
  trail,
}: {
  pathname: string;
  pageTitle?: TrustedPageTitle;
  trail?: readonly TrustedBreadcrumb[];
}) {
  const routeTrail = Boolean(trail?.length);
  const parts = routeTrail ? trail! : breadcrumbsForPath(pathname, pageTitle);
  if (!parts.length) return null;
  return (
    <nav aria-label="Навігаційний шлях" className="mb-5 text-sm text-slate-400">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link
            href="/"
            aria-label="DSS Universe"
            className="flex items-center text-violet-300 hover:text-violet-200"
          >
            <Home className="size-4" aria-hidden="true" />
          </Link>
        </li>
        {parts.map((part, index) => (
          <li key={`${part.href}-${index}`} className="flex items-center gap-2">
            <ChevronRight className="size-3.5 text-slate-500" aria-hidden="true" />
            {index === parts.length - 1 && (routeTrail || pathname === part.href) ? (
              <span aria-current="page" className="font-medium text-slate-100">
                {part.label}
              </span>
            ) : part.href ? (
              <Link href={part.href} className="text-violet-300 hover:text-violet-200">
                {part.label}
              </Link>
            ) : (
              <span>{part.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ShellSearch() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  return (
    <form
      role="search"
      className="hidden min-w-0 md:block"
      onSubmit={(event) => {
        event.preventDefault();
        const value = term.trim();
        if (value) router.push(`/community/search?q=${encodeURIComponent(value)}`);
      }}
    >
      <label className="flex h-10 w-64 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-slate-400 focus-within:border-violet-400 xl:w-72">
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">Пошук у спільноті</span>
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Пошук у спільноті…"
          className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
        />
      </label>
    </form>
  );
}

export function DssApplicationShell({
  children,
  viewer,
  variant = DEFAULT_SHELL_VARIANT,
  toolbar,
  canAccessAdminDeck = false,
  pageTitle,
  breadcrumbs,
}: PropsWithChildren<{
  viewer: SessionViewer | null;
  variant?: ShellVariant;
  toolbar?: ReactNode;
  canAccessAdminDeck?: boolean;
  pageTitle?: TrustedPageTitle;
  breadcrumbs?: readonly TrustedBreadcrumb[];
}>) {
  const pathname = usePathname();
  // Keep drawer state local and route-scoped, without an effect that could
  // unexpectedly close the drawer after a user opens it.
  const [drawerState, setDrawerState] = useState({ pathname, open: false });
  // Reset on route changes (including browser Back/Forward), not only links
  // inside the drawer. Guarded render-time adjustment avoids an effect race.
  if (drawerState.pathname !== pathname) {
    setDrawerState({ pathname, open: false });
  }
  const open = isDrawerOpenForPath(drawerState, pathname);
  const setOpen = (nextOpen: boolean) => setDrawerState({ pathname, open: nextOpen });
  const hasSession = Boolean(viewer);

  return (
    <div data-shell-variant={variant} className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:not-sr-only focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Перейти до вмісту
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[color:var(--shell-divider)] bg-[color:var(--shell-surface)] lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNavigation
            pathname={pathname}
            hasSession={hasSession}
            canAccessAdminDeck={canAccessAdminDeck}
          />
        </div>
        <p className="px-5 pb-5 text-xs text-slate-500">Build. Inspire. Grow.</p>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[color:var(--shell-divider)] bg-[color:var(--shell-surface)] px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Відкрити навігацію"
            aria-haspopup="dialog"
            aria-expanded={open}
            className="lg:hidden"
          >
            <Menu aria-hidden="true" />
          </Button>
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <GlobalNavigation
            pathname={pathname}
            variant={variant}
            hasSession={hasSession}
            canAccessAdminDeck={canAccessAdminDeck}
            launcherOpen={open}
            onOpenLauncher={() => setOpen(true)}
          />
          <div className="ml-auto flex items-center gap-2">
            <ShellSearch />
            {viewer ? (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  aria-label="Налаштування"
                  className="hidden lg:inline-flex"
                >
                  <Link href="/settings/profile">
                    <Settings aria-hidden="true" />
                  </Link>
                </Button>
                <form action={logoutAction}>
                  <Button variant="ghost" size="icon" type="submit" aria-label="Вийти">
                    <LogOut aria-hidden="true" />
                  </Button>
                </form>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      type="button"
                      className="h-auto gap-2.5 px-2"
                      aria-label={`Меню користувача: ${viewerDisplayName(viewer)}`}
                    >
                      <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-700 text-white">
                          {viewerInitials(viewer)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden flex-col items-start leading-tight sm:flex">
                        <span className="max-w-36 truncate text-sm font-semibold text-slate-100">
                          {viewerDisplayName(viewer)}
                        </span>
                        <span className="max-w-36 truncate text-xs text-slate-400">
                          @{viewer.username}
                        </span>
                      </span>
                      <ChevronDown className="size-4 text-slate-400" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-60 border border-[color:var(--shell-divider)] bg-[color:var(--shell-surface)]"
                  >
                    <DropdownMenuLabel>
                      <span className="block truncate text-sm">{viewerDisplayName(viewer)}</span>
                      <span className="block truncate text-xs font-normal text-slate-400">
                        @{viewer.username}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/profile/${encodeURIComponent(viewer.username)}`}>
                        <UserRound aria-hidden="true" />
                        Мій профіль
                      </Link>
                    </DropdownMenuItem>
                    {canAccessAdminDeck ? (
                      <DropdownMenuItem asChild>
                        <Link href="/command-deck">
                          <LayoutDashboard aria-hidden="true" />
                          Адмінпанель
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem asChild>
                      <Link href="/settings/profile">
                        <Settings aria-hidden="true" />
                        Налаштування
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild size="sm">
                <Link href={`/login?returnTo=${encodeURIComponent(pathname)}`}>
                  <LogIn aria-hidden="true" />
                  Увійти
                </Link>
              </Button>
            )}
          </div>
        </header>

        <main id="main-content" className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <Breadcrumbs pathname={pathname} pageTitle={pageTitle} trail={breadcrumbs} />
          {toolbar ? (
            <div
              role="toolbar"
              aria-label="Дії сторінки"
              className="mb-5 flex flex-wrap items-center gap-2"
            >
              {toolbar}
            </div>
          ) : null}
          {children}
        </main>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="border-[color:var(--shell-divider)] bg-[color:var(--shell-surface)] p-0"
        >
          <SheetHeader className="border-b border-[color:var(--shell-divider)] px-5 py-4">
            <SheetTitle className="text-left text-sm text-slate-100">
              Навігація DSS Universe
            </SheetTitle>
            <SheetDescription className="text-left text-xs">
              Оберіть доступний розділ платформи.
            </SheetDescription>
          </SheetHeader>
          <div className="max-h-[calc(100dvh-5rem)] overflow-y-auto px-3 py-4">
            <SidebarNavigation
              pathname={pathname}
              hasSession={hasSession}
              canAccessAdminDeck={canAccessAdminDeck}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function viewerInitials(viewer: SessionViewer | null) {
  const value = viewer?.displayName?.trim() || viewer?.username || "DSS";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
