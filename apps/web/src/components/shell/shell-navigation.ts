import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Newspaper,
  PenLine,
  Settings,
  Users,
  Boxes,
} from "lucide-react";

export const SHELL_VARIANTS = [
  "MODULE_LAUNCHER",
  "HORIZONTAL_NAVIGATION",
  "HYBRID",
] as const;

export type ShellVariant = (typeof SHELL_VARIANTS)[number];

export const DEFAULT_SHELL_VARIANT: ShellVariant = "MODULE_LAUNCHER";

export function isShellVariant(value: unknown): value is ShellVariant {
  return typeof value === "string" && SHELL_VARIANTS.some((item) => item === value);
}

export type ModuleNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type ModuleNavigation = ModuleNavigationItem & {
  children: readonly ModuleNavigationItem[];
  featured?: boolean;
  /** Presentation only. Server-side route guards remain authoritative. */
  requiresSession?: boolean;
  requiresAdminDeck?: boolean;
};

/**
 * Only verified implemented routes are navigable.
 * This registry is a presentation contract, never an authorization boundary.
 * Future Academy, Community and AI routes must be added when their actual pages ship.
 */
export const MODULE_NAVIGATION: readonly ModuleNavigation[] = [
  {
    href: "/command-deck",
    label: "Адмінпанель",
    icon: LayoutDashboard,
    requiresSession: true,
    requiresAdminDeck: true,
    children: [],
  },
  {
    href: "/news",
    label: "Новини",
    icon: Newspaper,
    featured: true,
    children: [],
  },
  {
    href: "/newsroom",
    label: "Newsroom",
    icon: PenLine,
    requiresSession: true,
    children: [{ href: "/newsroom/new", label: "Нова стаття", icon: PenLine }],
  },
  {
    href: "/members",
    label: "Учасники",
    icon: Users,
    featured: true,
    children: [],
  },
  {
    href: "/media",
    label: "Медіатека",
    icon: Boxes,
    children: [],
  },
  {
    href: "/settings/profile",
    label: "Налаштування",
    icon: Settings,
    requiresSession: true,
    children: [],
  },
] as const;

export function routeMatches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function currentModule(pathname: string): ModuleNavigation | null {
  return MODULE_NAVIGATION
    .filter((entry) => routeMatches(pathname, entry.href))
    .sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

export function moduleSidebarItems(pathname: string): readonly ModuleNavigationItem[] {
  const activeModule = currentModule(pathname);
  if (!activeModule) return [];

  const overview = activeModule.href;
  // Contextual navigation is stable across sibling routes, not filtered to the current page.
  const children = activeModule.children;
  return [
    { href: overview, label: "Огляд", icon: activeModule.icon },
    ...children,
  ];
}

export function breadcrumbsForPath(pathname: string): readonly { href: string; label: string }[] {
  const activeModule = currentModule(pathname);
  if (!activeModule) return [];

  const child = activeModule.children.find((item) => routeMatches(pathname, item.href));
  return [
    { href: activeModule.href, label: activeModule.label },
    ...(child ? [{ href: child.href, label: child.label }] : []),
  ];
}

/** Reduces dead-end links for guests, without substituting for API/route authorization. */
export function visibleModules(
  hasSession: boolean,
  canAccessAdminDeck = false,
): readonly ModuleNavigation[] {
  return MODULE_NAVIGATION.filter(
    (item) =>
      (hasSession || !item.requiresSession) &&
      (!item.requiresAdminDeck || (hasSession && canAccessAdminDeck)),
  );
}
