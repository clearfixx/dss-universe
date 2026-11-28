"use client";

import { BellRing, ChevronDown, ChevronRight, Code2, Flame, Languages, LayoutDashboard, LogIn, LogOut, Plus, Rocket, Settings, ShieldCheck, Star, Sun, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { SessionViewer } from "@/features/auth/session-contract";
import { quickAddItems } from "./shell-navigation";
import { viewerDisplayName } from "./personal-hub-presentation";
import { ShellLogoutDialog } from "./shell-logout-dialog";

export type ViewerMenuProgress = {
  currentLevel: number;
  pointsIntoLevel: number;
  pointsNeeded: number;
  progressPercent: number;
};

export type ViewerMenuStats = {
  postCount: number;
  reputation: number;
  level: number;
};

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
 * Personal menu (mockup «User Menu – Expanded Personal Hub»). Values come from
 * the session and the API. Where the API has no data yet, the field shows an
 * empty mark instead of a made-up number, and features without a route are
 * disabled with the «скоро» label.
 */
export function ShellUserMenu({
  viewer,
  pathname,
  canAccessAdminDeck,
  canModerate = false,
  progress = null,
  stats = null,
}: {
  viewer: SessionViewer | null;
  pathname: string;
  canAccessAdminDeck: boolean;
  canModerate?: boolean;
  progress?: ViewerMenuProgress | null;
  stats?: ViewerMenuStats | null;
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
  const staffItems = [
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
              <span className="max-w-36 truncate text-xs text-muted-foreground">
                {progress ? `Lv ${progress.currentLevel}` : `@${viewer.username}`}
              </span>
            </span>
            <ChevronDown className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[20rem] max-w-[calc(100vw-16px)] overflow-y-auto overflow-x-hidden bg-popover p-0 max-h-[min(34rem,var(--radix-dropdown-menu-content-available-height))]">
          {/* Identity */}
          <div className="flex items-center gap-2.5 px-3 pb-2 pt-3">
            <span className="relative shrink-0">
              <Avatar className="size-10">
                {viewer.avatarUrl ? <AvatarImage src={viewer.avatarUrl} alt="" /> : null}
                <AvatarFallback className="bg-secondary text-sm text-secondary-foreground">{viewerInitials(viewer)}</AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-popover bg-emerald-400" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{name}</p>
              <p className="truncate text-xs text-muted-foreground">@{viewer.username}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/50 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Онлайн
            </span>
          </div>

          {/* Level and XP */}
          <div className="px-3 pb-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                {progress ? `Рівень ${progress.currentLevel}` : "Рівень"}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {progress ? `${progress.pointsIntoLevel.toLocaleString("uk-UA")} / ${progress.pointsNeeded.toLocaleString("uk-UA")} XP` : "—"}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted" role="presentation">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, progress?.progressPercent ?? 0))}%` }} />
            </div>
          </div>

          {/* Key stats: streak has no API source yet, so it stays an empty mark */}
          <div className="grid grid-cols-3 gap-1 border-y border-border px-3 py-2">
            <Stat icon={<ShieldCheck />} label="репутація" value={stats?.reputation ?? null} />
            <Stat icon={<Star />} label="дописи" value={stats?.postCount ?? null} />
            <Stat icon={<Flame />} label="дні підряд" value={null} />
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-0.5 p-1">
            <DropdownMenuItem asChild className="min-h-8 gap-2 px-2 text-sm">
              <Link href={`/profile/${encodeURIComponent(viewer.username)}`}>
                <UserRound aria-hidden="true" className="size-4 shrink-0" />
                Мій профіль
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="min-h-8 gap-2 px-2 text-sm">
              <Star aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">Моя активність</span>
              <SoonTag />
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="min-h-8 gap-2 px-2 text-sm">
              <Link href="/community/following">
                <BellRing aria-hidden="true" className="size-4 shrink-0" />
                Мої підписки
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="min-h-8 gap-2 px-2 text-sm">
              <Code2 aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">Чернетки</span>
              <SoonTag />
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator className="m-0" />

          {/* Primary action */}
          <div className="p-1">
            <DropdownMenuItem asChild className="min-h-9 justify-between px-2 text-sm text-primary focus:bg-primary/15 focus:text-primary">
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

          {/* Interface and settings */}
          <div className="p-1 text-sm">
            <DropdownMenuItem disabled className="min-h-8 justify-between gap-2 px-2">
              <span className="flex items-center gap-2"><Sun aria-hidden="true" className="size-4" />Зовнішній вигляд</span>
              <SoonTag />
            </DropdownMenuItem>
            <div className="flex min-h-8 items-center justify-between gap-2 px-2 text-muted-foreground">
              <span className="flex items-center gap-2"><Languages aria-hidden="true" className="size-4" />Мова інтерфейсу</span>
              <span className="text-foreground">Українська</span>
            </div>
            <div className="flex min-h-8 items-center justify-between gap-2 px-2 text-muted-foreground">
              <span className="flex items-center gap-2"><Code2 aria-hidden="true" className="size-4" />Developer HUD</span>
              <span className="flex items-center gap-2">
                <SoonTag />
                <span className="relative inline-flex h-4 w-7 shrink-0 items-center rounded-full bg-muted" aria-hidden="true">
                  <span className="ml-0.5 size-3 rounded-full bg-background" />
                </span>
              </span>
            </div>
            <DropdownMenuItem asChild className="min-h-8 justify-between gap-2 px-2">
              <Link href="/settings/profile">
                <span className="flex items-center gap-2"><Settings aria-hidden="true" className="size-4" />Налаштування</span>
                <ChevronRight aria-hidden="true" className="size-4" />
              </Link>
            </DropdownMenuItem>
            {staffItems.map(({ href, label, icon: Icon }) => (
              <DropdownMenuItem key={href} asChild className="min-h-8 gap-2 px-2">
                <Link href={href}>
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
          </div>

          <DropdownMenuSeparator className="m-0" />

          <div className="p-1">
            <DropdownMenuItem
              variant="destructive"
              className="min-h-8 gap-2 px-2 text-sm"
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

/** A stat without data yet: the icon and label stay, the value is an empty mark. */
function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number | null }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span className="flex items-center text-primary [&_svg]:size-3.5" aria-hidden="true">{icon}</span>
      {value === null ? (
        <span className="text-base font-semibold tabular-nums text-muted-foreground" aria-label={`${label}: даних ще немає`}>—</span>
      ) : (
        <span className="text-base font-semibold tabular-nums text-foreground">{value.toLocaleString("uk-UA")}</span>
      )}
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function SoonTag() {
  return <span className="ml-auto shrink-0 text-xs text-muted-foreground">скоро</span>;
}

function viewerInitials(viewer: SessionViewer | null) {
  const value = viewer?.displayName?.trim() || viewer?.username || "DSS";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
