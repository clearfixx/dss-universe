"use client";

import { ChevronDown, LayoutDashboard, LogIn, LogOut, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/features/auth/auth-actions";
import type { SessionViewer } from "@/features/auth/session-contract";
import { viewerDisplayName } from "./personal-hub-presentation";

export function ShellUserMenu({ viewer, pathname, canAccessAdminDeck }: { viewer: SessionViewer | null; pathname: string; canAccessAdminDeck: boolean }) {
  return (<>
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
                        <AvatarFallback className="bg-violet-700 text-white">
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

