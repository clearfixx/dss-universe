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
 * (logo, global modules, the active module's sections), a slim top bar with
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
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useState,
  useRef,
  useSyncExternalStore,
  type PropsWithChildren,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { DesignScope } from "@/components/ui/design-scope";
import { cn } from "@/lib/utils";
import type { SessionViewer } from "@/features/auth/session-contract";

import { isDrawerOpenForPath } from "./shell-drawer-state";

import {
  type ShellVariant,
  type TrustedPageTitle,
} from "./shell-navigation";

import { Breadcrumbs, type TrustedBreadcrumb } from "./shell-breadcrumbs";

import { Logo } from "./shell-logo";
import { ModuleNavigation, SidebarNavigation } from "./shell-sidebar";
import { ShellSearch } from "./shell-search";
import { ShellMobileNavigation } from "./shell-mobile-navigation";
import { ShellQuickAdd, ShellUserMenu, type ViewerMenuProgress } from "./shell-user-menu";
import { ShellHeaderActions } from "./shell-header-actions";

export { Breadcrumbs, type TrustedBreadcrumb } from "./shell-breadcrumbs";

const SIDEBAR_STORAGE_KEY = "dss-shell-sidebar-collapsed";
const SIDEBAR_CHANGE_EVENT = "dss-shell-sidebar-change";

function subscribeSidebarCollapsed(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SIDEBAR_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SIDEBAR_CHANGE_EVENT, onChange);
  };
}

function readSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function DssApplicationShell({
  children,
  viewer,
  variant,
  toolbar,
  canAccessAdminDeck = false,
  canModerate = false,
  viewerProgress = null,
  unreadCount = null,
  pageTitle,
  breadcrumbs,
}: PropsWithChildren<{
  viewer: SessionViewer | null;
  viewerProgress?: ViewerMenuProgress | null;
  unreadCount?: number | null;
  /**
   * Stored admin setting, kept for compatibility only. The navigation
   * composition is fixed by the owner decision of 2026-11-28 (variant B).
   */
  variant?: ShellVariant;
  toolbar?: ReactNode;
  canAccessAdminDeck?: boolean;
  canModerate?: boolean;
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

  // Desktop rail state is read from storage through useSyncExternalStore:
  // the server renders expanded, the client restores the stored choice.
  const sidebarCollapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    readSidebarCollapsed,
    () => false,
  );
  const toggleSidebar = () => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? "0" : "1");
    } catch {
      /* Storage is optional; the rail still toggles for this page view. */
    }
    window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
  };

  return (
    <div data-shell-variant={variant ?? "MODULE_LAUNCHER"} className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:not-sr-only focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Перейти до вмісту
      </a>

      {/* Two independent regions: the fixed module zone never pushes the
          contextual zone out of view; only the contextual zone scrolls. */}
      <DesignScope
        as="aside"
        id="shell-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[color:var(--shell-divider)] bg-[color:var(--shell-surface)] transition-[width] duration-200 lg:flex",
          sidebarCollapsed ? "w-16" : "w-60",
        )}
      >
        <div className={cn("flex h-14 shrink-0 items-center", sidebarCollapsed ? "justify-center" : "px-4")}>
          <Logo compact={sidebarCollapsed} />
        </div>
        <div
          className={cn(
            "max-h-[50%] shrink-0 overflow-y-auto py-2 [scrollbar-width:thin] [scrollbar-color:var(--shell-divider)_transparent]",
            sidebarCollapsed ? "px-2" : "px-3",
          )}
        >
          <ModuleNavigation
            pathname={pathname}
            hasSession={hasSession}
            canAccessAdminDeck={canAccessAdminDeck}
            compact={sidebarCollapsed}
          />
        </div>
        {sidebarCollapsed ? (
          <div className="flex-1" />
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto border-t border-[color:var(--shell-divider)] px-3 py-4 [scrollbar-width:thin] [scrollbar-color:var(--shell-divider)_transparent] hover:[scrollbar-color:var(--muted-foreground)_transparent]">
              <SidebarNavigation
                pathname={pathname}
                hasSession={hasSession}
                canAccessAdminDeck={canAccessAdminDeck}
                canModerate={canModerate}
              />
            </div>
            <div className="m-3 shrink-0 border-t border-[color:var(--shell-divider)] px-3 py-3 text-xs leading-5 text-muted-foreground">
              <p className="font-semibold text-foreground">DSS Universe</p>
              <p>Build. Inspire. Grow.</p>
            </div>
          </>
        )}
      </DesignScope>

      <div className={cn("transition-[padding] duration-200", sidebarCollapsed ? "lg:pl-16" : "lg:pl-60")}>
        <DesignScope as="header" className="sticky top-0 z-20 flex h-14 items-center gap-1 sm:gap-3 border-b border-[color:var(--shell-divider)] bg-[color:var(--shell-surface)] px-2 sm:px-6">
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
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Розгорнути навігацію" : "Згорнути навігацію"}
            aria-expanded={!sidebarCollapsed}
            aria-controls="shell-sidebar"
            className="hidden lg:inline-flex"
          >
            {sidebarCollapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </Button>
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
            <ShellSearch />
            {hasSession ? <ShellHeaderActions unreadCount={unreadCount} /> : null}
            {hasSession ? <ShellQuickAdd canAccessAdminDeck={canAccessAdminDeck} /> : null}
            <ShellUserMenu viewer={viewer} pathname={pathname} canAccessAdminDeck={canAccessAdminDeck} canModerate={canModerate} progress={viewerProgress} />
          </div>
        </DesignScope>

        <main id="main-content" className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <DesignScope className="bg-transparent">
            <Breadcrumbs pathname={pathname} pageTitle={pageTitle} trail={breadcrumbs} />
          </DesignScope>
          {toolbar ? (
            <div
              role="toolbar"
              aria-label="Дії сторінки"
              className="mb-4 flex min-w-0 flex-wrap items-center gap-2 border-b pb-3"
            >
              {toolbar}
            </div>
          ) : null}
          {children}
        </main>
      </div>

      <DesignScope className="bg-transparent">
        <ShellMobileNavigation onRestoreFocus={restoreDrawerFocus} open={open} setOpen={setOpen} pathname={pathname} hasSession={hasSession} canAccessAdminDeck={canAccessAdminDeck} canModerate={canModerate} />
      </DesignScope>
    </div>
  );
}
