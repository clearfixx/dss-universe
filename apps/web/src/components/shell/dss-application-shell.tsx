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
 * (logo and the active module's sections), a top bar with module tabs,
 * search and the user menu, and violet breadcrumbs with a home icon.
 *
 * ⚠️ Important:
 * Navigation stays a presentation contract (shell-navigation.ts); server
 * guards remain authoritative. Route owners may pass a deeper, trusted
 * breadcrumb trail (e.g. forum category › section › topic).
 *
 * 🚀 Build. Inspire. Grow.
 * ===============================================================
 */
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useState,
  useRef,
  type PropsWithChildren,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import type { SessionViewer } from "@/features/auth/session-contract";

import { isDrawerOpenForPath } from "./shell-drawer-state";

import {
  DEFAULT_SHELL_VARIANT,
  type ShellVariant,
  type TrustedPageTitle,
} from "./shell-navigation";

import { Breadcrumbs, type TrustedBreadcrumb } from "./shell-breadcrumbs";

import { Logo } from "./shell-logo";
import { GlobalNavigation } from "./shell-navbar";
import { SidebarNavigation } from "./shell-sidebar";
import { ShellSearch } from "./shell-search";
import { ShellMobileNavigation } from "./shell-mobile-navigation";
import { ShellQuickAdd, ShellUserMenu } from "./shell-user-menu";

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
  const drawerTrigger = useRef<HTMLButtonElement | null>(null);
  const openDrawer = (trigger: HTMLButtonElement) => {
    drawerTrigger.current = trigger;
    setOpen(true);
  };
  const restoreDrawerFocus = () => {
    if (drawerTrigger.current?.getClientRects().length) drawerTrigger.current.focus();
  };
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
        <div className="m-3 rounded-xl bg-muted/40 px-4 py-3 text-xs leading-5 text-muted-foreground">
          <p className="font-semibold text-foreground">DSS Universe</p>
          <p>Build. Inspire. Grow.</p>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-1.5 sm:gap-3 border-b border-[color:var(--shell-divider)] bg-[color:var(--shell-surface)] px-2 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={(event) => openDrawer(event.currentTarget)}
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
            onOpenLauncher={openDrawer}
          />
          <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
            <ShellSearch />
            {hasSession ? <ShellQuickAdd canAccessAdminDeck={canAccessAdminDeck} /> : null}
            <ShellUserMenu viewer={viewer} pathname={pathname} canAccessAdminDeck={canAccessAdminDeck} />
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

      <ShellMobileNavigation onRestoreFocus={restoreDrawerFocus} open={open} setOpen={setOpen} pathname={pathname} hasSession={hasSession} canAccessAdminDeck={canAccessAdminDeck} />
    </div>
  );
}
