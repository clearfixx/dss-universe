"use client";

import { ChevronDown, LayoutDashboard, LogIn, LogOut, Menu, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type PropsWithChildren, type ReactNode } from "react";

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
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { logoutAction } from "@/features/auth/auth-actions";
import type { SessionViewer } from "@/features/auth/session-contract";
import { cn } from "@/lib/utils";

import {
  DEFAULT_SHELL_VARIANT,
  MODULE_NAVIGATION,
  breadcrumbsForPath,
  currentModule,
  moduleSidebarItems,
  routeMatches,
  type ShellVariant,
} from "./shell-navigation";

function ModuleLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Модулі DSS Universe" className="space-y-1">
      {MODULE_NAVIGATION.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          onClick={onNavigate}
          className={cn(
            "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400",
            routeMatches(pathname, href) && "bg-violet-500/15 text-violet-200",
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function GlobalNavigation({
  pathname,
  variant,
  onOpenLauncher,
}: {
  pathname: string;
  variant: ShellVariant;
  onOpenLauncher: () => void;
}) {
  const featured = MODULE_NAVIGATION.filter((item) => item.featured);
  const inline = variant === "HORIZONTAL_NAVIGATION" ? MODULE_NAVIGATION : featured;

  return (
    <div className="hidden min-w-0 items-center gap-1 lg:flex">
      {variant !== "MODULE_LAUNCHER" && (
        <nav aria-label="Глобальна навігація" className="flex min-w-0 items-center gap-1">
          {inline.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={routeMatches(pathname, href) ? "page" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-2.5 text-xs text-slate-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400",
                routeMatches(pathname, href) && "bg-violet-500/15 text-violet-200",
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              <span className="hidden xl:inline">{label}</span>
            </Link>
          ))}
        </nav>
      )}
      <Button type="button" variant="outline" size="sm" onClick={onOpenLauncher}>
        <Menu aria-hidden="true" />
        {variant === "MODULE_LAUNCHER" ? "Модулі" : "Усі модулі"}
        <ChevronDown aria-hidden="true" className="size-3" />
      </Button>
    </div>
  );
}

function ModuleSidebar({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const activeModule = currentModule(pathname);
  const links = moduleSidebarItems(pathname);
  if (!activeModule) return null;

  const Icon = activeModule.icon;
  return (
    <div className="p-3">
      <div className="mb-5 flex items-center gap-3 px-2 py-3">
        <Icon className="size-5 text-violet-300" aria-hidden="true" />
        <p className="text-sm font-semibold text-slate-100">{activeModule.label}</p>
      </div>
      <nav aria-label={`Розділи: ${activeModule.label}`} className="space-y-1.5">
        {links.map(({ href, label, icon: LinkIcon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={pathname === href ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-lg bg-white/[0.035] px-3 text-sm text-slate-300 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400",
              pathname === href && "bg-violet-500/15 text-violet-200",
            )}
          >
            <LinkIcon aria-hidden="true" className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const parts = breadcrumbsForPath(pathname);
  if (!parts.length) return null;
  return (
    <nav aria-label="Навігаційний шлях" className="mb-5 text-xs text-slate-400">
      <ol className="flex flex-wrap items-center gap-2">
        <li><Link href="/" className="hover:text-white">DSS Universe</Link></li>
        {parts.map((part, index) => (
          <li key={part.href} className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            {index === parts.length - 1 ? (
              <span aria-current="page" className="text-slate-200">{part.label}</span>
            ) : (
              <Link href={part.href} className="hover:text-white">{part.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function DssApplicationShell({
  children,
  viewer,
  variant = DEFAULT_SHELL_VARIANT,
  toolbar,
}: PropsWithChildren<{ viewer: SessionViewer | null; variant?: ShellVariant; toolbar?: ReactNode }>) {
  const pathname = usePathname();
  // Drawer visibility is local presentation state, never shared product state.
  const [open, setOpen] = useState(false);
  const hasSidebar = Boolean(currentModule(pathname));

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <div data-shell-variant={variant} className="min-h-screen bg-background text-foreground">
      <a href="#main-content" className="sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:not-sr-only focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Перейти до вмісту</a>
      <header className="sticky top-0 z-40 flex min-h-16 items-center gap-3 border-b border-[color:var(--shell-divider)] bg-[color:var(--shell-surface)] px-4 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Відкрити навігацію"
          className="lg:hidden"
        >
          <Menu aria-hidden="true" />
        </Button>
        <Link href="/" className="shrink-0 text-sm font-semibold tracking-[0.12em] text-slate-100 sm:text-base">
          DSS UNIVERSE
        </Link>
        <GlobalNavigation pathname={pathname} variant={variant} onOpenLauncher={() => setOpen(true)} />
        <div className="ml-auto flex items-center gap-2">
          {viewer ? (
            <>
              <Button asChild variant="ghost" size="icon" aria-label="Налаштування">
                <Link href="/settings/profile"><Settings aria-hidden="true" /></Link>
              </Button>
              <form action={logoutAction}>
                <Button variant="ghost" size="icon" type="submit" aria-label="Вийти">
                  <LogOut aria-hidden="true" />
                </Button>
              </form>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" type="button" className="h-auto gap-2 px-2" aria-label="Відкрити меню користувача">
                    <Avatar><AvatarFallback>{viewerInitials(viewer)}</AvatarFallback></Avatar>
                    <span className="hidden max-w-36 truncate text-sm text-slate-200 sm:block">{viewer.displayName || viewer.username}</span>
                    <ChevronDown className="size-4 text-slate-400" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 border border-[color:var(--shell-divider)] bg-[color:var(--shell-surface)]">
                  <DropdownMenuLabel>
                    <span className="block truncate text-sm">{viewer.displayName || viewer.username}</span>
                    <span className="block truncate text-xs font-normal text-slate-400">@{viewer.username}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${encodeURIComponent(viewer.username)}`}><UserRound aria-hidden="true" />Мій профіль</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/command-deck"><LayoutDashboard aria-hidden="true" />Mission Control</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/profile"><Settings aria-hidden="true" />Налаштування</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href={`/login?returnTo=${encodeURIComponent(pathname)}`}><LogIn aria-hidden="true" />Увійти</Link>
            </Button>
          )}
        </div>
      </header>

      {hasSidebar && (
        <aside className="fixed bottom-0 left-0 top-16 hidden w-60 overflow-y-auto border-r border-[color:var(--shell-divider)] bg-[color:var(--shell-surface)] lg:block">
          <ModuleSidebar pathname={pathname} />
        </aside>
      )}
      <div className={hasSidebar ? "lg:pl-60" : undefined}>
        <main id="main-content" className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <Breadcrumbs pathname={pathname} />
          {toolbar ? <div role="toolbar" aria-label="Дії сторінки" className="mb-5 flex flex-wrap items-center gap-2">{toolbar}</div> : null}
          {children}
        </main>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="border-[color:var(--shell-divider)] bg-[color:var(--shell-surface)] p-0">
          <SheetHeader className="border-b border-[color:var(--shell-divider)] px-5 py-4">
            <SheetTitle className="text-left text-sm text-slate-100">Навігація DSS Universe</SheetTitle>
          </SheetHeader>
          <div className="max-h-[calc(100dvh-5rem)] overflow-y-auto px-3 py-4">
            <ModuleLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            {hasSidebar && (
              <div className="mt-5 border-t border-[color:var(--shell-divider)] pt-2">
                <ModuleSidebar pathname={pathname} onNavigate={() => setOpen(false)} />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function viewerInitials(viewer: SessionViewer | null) {
  const value = viewer?.displayName?.trim() || viewer?.username || "DSS";
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}
