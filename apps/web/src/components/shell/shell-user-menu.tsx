"use client";

import { ChevronDown, LayoutDashboard, LogIn, LogOut, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/features/auth/auth-actions";
import type { SessionViewer } from "@/features/auth/session-contract";
import { viewerDisplayName } from "./personal-hub-presentation";

export function ShellUserMenu({ viewer, pathname, canAccessAdminDeck }: { viewer: SessionViewer | null; pathname: string; canAccessAdminDeck: boolean }) {
  return (<>
{viewer ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      type="button"
                      className="h-auto shrink-0 gap-1 px-1 sm:gap-2.5 sm:px-2"
                      aria-label={`Меню користувача: ${viewerDisplayName(viewer)}`}
                    >
                      <Avatar>
                        {viewer.avatarUrl ? <AvatarImage src={viewer.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {viewerInitials(viewer)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden flex-col items-start leading-tight xl:flex">
                        <span className="max-w-36 truncate text-sm font-semibold text-slate-100">
                          {viewerDisplayName(viewer)}
                        </span>
                        <span className="max-w-36 truncate text-xs text-slate-400">
                          @{viewer.username}
                        </span>
                      </span>
                      <ChevronDown className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
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
                    <DropdownMenuSeparator />
                    <form action={logoutAction}>
                      <DropdownMenuItem asChild>
                        <button type="submit" className="w-full">
                          <LogOut aria-hidden="true" />
                          Вийти
                        </button>
                      </DropdownMenuItem>
                    </form>
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

