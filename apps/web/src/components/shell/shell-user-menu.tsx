"use client";

import { ChevronDown, LayoutDashboard, LogIn, LogOut, Plus, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/features/auth/auth-actions";
import type { SessionViewer } from "@/features/auth/session-contract";
import { quickAddItems } from "./shell-navigation";
import { viewerDisplayName } from "./personal-hub-presentation";

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
        <DropdownMenuLabel>Створити</DropdownMenuLabel>
        {actions.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild className="min-h-9 gap-2 px-2">
            <Link href={href}><Icon aria-hidden="true" />{label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ShellUserMenu({ viewer, pathname, canAccessAdminDeck }: { viewer: SessionViewer | null; pathname: string; canAccessAdminDeck: boolean }) {
  const logoutForm = useRef<HTMLFormElement>(null);
  return (<>
{viewer ? (
              <>
                <form ref={logoutForm} action={logoutAction} hidden />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      type="button"
                      className="h-10 shrink-0 gap-1 px-1 sm:gap-2 sm:px-2"
                      aria-label={`Меню користувача: ${viewerDisplayName(viewer)}`}
                    >
                      <Avatar>
                        {viewer.avatarUrl ? <AvatarImage src={viewer.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                          {viewerInitials(viewer)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden flex-col items-start leading-tight xl:flex">
                        <span className="max-w-36 truncate text-sm font-semibold text-foreground">
                          {viewerDisplayName(viewer)}
                        </span>
                        <span className="max-w-36 truncate text-xs text-muted-foreground">
                          @{viewer.username}
                        </span>
                      </span>
                      <ChevronDown className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-64 max-w-[calc(100vw-16px)] bg-popover"
                  >
                    <DropdownMenuLabel className="flex items-center gap-3 px-2 py-3">
                      <Avatar className="size-10 shrink-0">
                        {viewer.avatarUrl ? <AvatarImage src={viewer.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="bg-secondary text-secondary-foreground">{viewerInitials(viewer)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{viewerDisplayName(viewer)}</span>
                        <span className="block truncate text-xs font-normal text-muted-foreground">@{viewer.username}</span>
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="min-h-9 gap-2 px-2">
                      <Link href={`/profile/${encodeURIComponent(viewer.username)}`}>
                        <UserRound aria-hidden="true" />
                        Мій профіль
                      </Link>
                    </DropdownMenuItem>
                    {canAccessAdminDeck ? (
                      <DropdownMenuItem asChild className="min-h-9 gap-2 px-2">
                        <Link href="/command-deck">
                          <LayoutDashboard aria-hidden="true" />
                          Адмінпанель
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem asChild className="min-h-9 gap-2 px-2">
                      <Link href="/settings/profile">
                        <Settings aria-hidden="true" />
                        Налаштування
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" className="min-h-9 gap-2 px-2" onSelect={() => logoutForm.current?.requestSubmit()}>
                      <LogOut aria-hidden="true" />
                      Вийти
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
  </>);
}

function viewerInitials(viewer: SessionViewer | null) {
  const value = viewer?.displayName?.trim() || viewer?.username || "DSS";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

