"use client";

import { ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { COMING_SOON_MODULES, visibleModules, navigationCurrent, routeMatches, type ShellVariant } from "./shell-navigation";

export function GlobalNavigation({
  pathname,
  variant,
  hasSession,
  canAccessAdminDeck,
}: {
  pathname: string;
  variant: ShellVariant;
  hasSession: boolean;
  canAccessAdminDeck: boolean;
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
                "inline-flex shrink-0 items-center border-b-2 border-transparent px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                routeMatches(pathname, href) &&
                  "border-primary bg-secondary/50 text-foreground",
              )}
            >
              {label}
            </Link>
          ))}
          {variant === "HORIZONTAL_NAVIGATION" && COMING_SOON_MODULES.map((label) => (
            <span key={label} className="inline-flex shrink-0 items-center gap-1 px-2.5 text-sm text-muted-foreground">
              {label} <span className="text-xs">(скоро)</span>
            </span>
          ))}
        </nav>
      )}
      <DropdownMenu key={pathname}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="shrink-0 self-center text-muted-foreground">
            <Menu aria-hidden="true" />
            <span className={variant === "MODULE_LAUNCHER" ? undefined : "sr-only 2xl:not-sr-only"}>
              {variant === "MODULE_LAUNCHER" ? "Модулі" : "Усі модулі"}
            </span>
            <ChevronDown aria-hidden="true" className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" aria-label="Модулі DSS Universe" className="w-56">
          <DropdownMenuLabel>Модулі DSS Universe</DropdownMenuLabel>
          {modules.map(({ href, label, icon: Icon }) => (
            <DropdownMenuItem key={href} asChild>
              <Link href={href} aria-current={navigationCurrent(pathname, href)} className={cn(routeMatches(pathname, href) && "bg-secondary text-foreground")}>
                <Icon aria-hidden="true" />
                {label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
