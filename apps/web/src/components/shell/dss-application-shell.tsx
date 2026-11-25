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
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Settings,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";

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

import { viewerDisplayName } from "./personal-hub-presentation";
import { isDrawerOpenForPath } from "./shell-drawer-state";

import {
  DEFAULT_SHELL_VARIANT,
  type ShellVariant,
  type TrustedPageTitle,
} from "./shell-navigation";

import { Breadcrumbs, type TrustedBreadcrumb } from "./shell-breadcrumbs";

import { Logo } from "./shell-logo";
import { GlobalNavigation } from "./shell-navbar";
import { ModuleNavigation, SidebarNavigation } from "./shell-sidebar";
import { ShellSearch } from "./shell-search";

export { Breadcrumbs, type TrustedBreadcrumb } from "./shell-breadcrumbs";
export { GlobalNavigation } from "./shell-navbar";

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
        <div className="m-3 rounded-xl bg-white/[0.04] px-4 py-3 text-xs leading-5 text-slate-400">
          <p className="font-semibold text-slate-200">DSS Universe</p>
          <p>Build. Inspire. Grow.</p>
        </div>
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
          <div className="max-h-[calc(100dvh-5rem)] space-y-4 overflow-y-auto px-3 py-4">
            <ModuleNavigation pathname={pathname} hasSession={hasSession} canAccessAdminDeck={canAccessAdminDeck} onNavigate={() => setOpen(false)} />
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
