"use client";

import { ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { visibleModules, navigationCurrent, routeMatches, type ShellVariant } from "./shell-navigation";

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
        <nav aria-label="Глобальна навігація" className="flex min-w-0 max-w-full items-stretch gap-0.5 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
          {inline.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={label}
              aria-current={navigationCurrent(pathname, href)}
              className={cn(
                "inline-flex shrink-0 items-center border-b-2 border-transparent px-2.5 text-sm text-slate-300 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400",
                routeMatches(pathname, href) &&
                  "border-violet-500 bg-violet-500/10 text-violet-100",
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
        className="shrink-0 self-center text-slate-300"
      >
        <Menu aria-hidden="true" />
        <span className={variant === "MODULE_LAUNCHER" ? undefined : "sr-only 2xl:not-sr-only"}>
          {variant === "MODULE_LAUNCHER" ? "Модулі" : "Усі модулі"}
        </span>
        <ChevronDown aria-hidden="true" className="size-3" />
      </Button>
    </div>
  );
}
