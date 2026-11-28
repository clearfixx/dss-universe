"use client";

import { BellRing, ChevronDown, ChevronRight, LayoutDashboard, LogIn, LogOut, Plus, Rocket, Settings, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { SessionViewer } from "@/features/auth/session-contract";
import { quickAddItems } from "./shell-navigation";
import { viewerDisplayName } from "./personal-hub-presentation";
import { ShellLogoutDialog } from "./shell-logout-dialog";

export function ShellQuickAdd({ canAccessAdminDeck }: { canAccessAdminDeck: boolean }) {
  const actions = quickAddItems(true, canAccessAdminDeck);

  if (!actions.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Швидке створення">
          <Plus aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover">
        {actions.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild className="min-h-9 gap-2 px-2">
            <Link href={href}><Icon aria-hidden="true" />{label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Personal menu (mockup «User Menu – Expanded Personal Hub»). Shows only data
 * the session really has: name, username, avatar and routes that exist. Level,
 * XP, reputation, badges and theme/language switches are not shown until the
 * API provides them.
 */
export function ShellUserMenu({
  viewer,
  pathname,
  canAccessAdminDeck,
  canModerate = false,
}: {
  viewer: SessionViewer | null;
  pathname: string;
  canAccessAdminDeck: boolean;
  canModerate?: boolean;
}) {
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (!viewer) {
    return (
      <Button asChild size="sm">
        <Link href={`/login?returnTo=${encodeURIComponent(pathname)}`}>
          <LogIn aria-hidden="true" />
          Увійти
        </Link>
      </Button>
    );
  }

  const name = viewerDisplayName(viewer);
  const accountItems = [
    { href: `/profile/${encodeURIComponent(viewer.username)}`, label: "Мій профіль", icon: UserRound },
    { href: "/community/following", label: "Мої підписки", icon: BellRing },
    { href: "/settings/profile", label: "Налаштування", icon: Settings },
    ...(canModerate ? [{ href: "/community/moderation", label: "Модерація", icon: ShieldCheck }] : []),
    ...(canAccessAdminDeck ? [{ href: "/command-deck", label: "Адмінпанель", icon: LayoutDashboard }] : []),
  ];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            type="button"
            className="h-10 shrink-0 gap-1 px-1 sm:gap-2 sm:px-2"
            aria-label={`Меню користувача: ${name}`}
          >
            <Avatar>
              {viewer.avatarUrl ? <AvatarImage src={viewer.avatarUrl} alt="" /> : null}
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                {viewerInitials(viewer)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden flex-col items-start leading-tight xl:flex">
              <span className="max-w-36 truncate text-sm font-semibold text-foreground">{name}</span>
              <span className="max-w-36 truncate text-xs text-muted-foreground">@{viewer.username}</span>
            </span>
            <ChevronDown className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-16px)] overflow-hidden bg-popover p-0">
          <div className="flex items-center gap-3 px-4 py-4">
            <Avatar className="size-12 shrink-0">
              {viewer.avatarUrl ? <AvatarImage src={viewer.avatarUrl} alt="" /> : null}
              <AvatarFallback className="bg-secondary text-secondary-foreground">{viewerInitials(viewer)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{name}</p>
              <p className="truncate text-xs text-muted-foreground">@{viewer.username}</p>
            </div>
          </div>
          <DropdownMenuSeparator className="m-0" />
          <div className="grid grid-cols-2 gap-1 p-2">
            {accountItems.map(({ href, label, icon: Icon }) => (
              <DropdownMenuItem key={href} asChild className="min-h-10 gap-2 px-2">
                <Link href={href}>
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator className="m-0" />
          <div className="p-2">
            <DropdownMenuItem asChild className="min-h-11 justify-between px-3 text-primary focus:bg-primary/15 focus:text-primary">
              <Link href="/">
                <span className="flex items-center gap-2 font-medium">
                  <Rocket aria-hidden="true" className="size-4" />
                  Відкрити Mission Control
                </span>
                <ChevronRight aria-hidden="true" className="size-4" />
              </Link>
            </DropdownMenuItem>
          </div>
          <DropdownMenuSeparator className="m-0" />
          <div className="p-2">
            <DropdownMenuItem
              variant="destructive"
              className="min-h-10 gap-2 px-3"
              onSelect={() => setLogoutOpen(true)}
            >
              <LogOut aria-hidden="true" className="size-4" />
              Вийти
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <ShellLogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
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
