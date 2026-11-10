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
    requiresSession: true,
    children: [],
  },
  {
    href: "/media",
    label: "Медіатека",
    icon: Boxes,
    requiresSession: true,
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

/** Exact destination is the page; an ancestor module represents the current location. */
export function navigationCurrent(
  pathname: string,
  href: string,
): "page" | "location" | undefined {
  if (pathname === href) return "page";
  return routeMatches(pathname, href) ? "location" : undefined;
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

/** Only the deepest matching Sidebar destination receives aria-current. */
export function currentSidebarHref(pathname: string): string | null {
  const candidates = moduleSidebarItems(pathname).filter((item) =>
    routeMatches(pathname, item.href),
  );
  return candidates.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

/**
 * Route-owned titles may only be used for the exact path that supplied them.
 * A previous page's title must never survive an App Router navigation.
 */
export type TrustedPageTitle = {
  pathname: string;
  title: string;
};

export function trustedPageTitle(
  pathname: string,
  page: TrustedPageTitle | undefined,
): string | null {
  if (!page || page.pathname !== pathname) return null;
  const title = page.title.trim();
  return title.length > 0 ? title : null;
}

/**
 * Routes with an existing owner but no place in the global module launcher.
 * No authorization decisions are derived from this presentation metadata.
 */
export function contextualBreadcrumbs(
  pathname: string,
): readonly { href: string; label: string }[] | null {
  if (pathname === "/settings/platform-appearance") {
    return [
      { href: "/settings/profile", label: "Налаштування" },
      { href: pathname, label: "Оформлення платформи" },
    ];
  }
  if (/^\\/profile\\/[^/]+$/.test(pathname)) {
    // The actual display name is supplied by the profile route owner,
    // never parsed or decoded from user-controlled URL segments.
    return [{ href: pathname, label: "Поточна сторінка" }];
  }
  return null;
}

export function breadcrumbsForPath(
  pathname: string,
  page?: TrustedPageTitle,
): readonly { href: string; label: string }[] {
  const activeModule = currentModule(pathname);
  // Context routes have breadcrumbs but are not global module entries.
  // This keeps personal profiles and admin settings out of launchers.
  const context = contextualBreadcrumbs(pathname);
  if (!activeModule && !context) return [];

  const child = activeModule?.children.find((item) =>
    routeMatches(pathname, item.href),
  );
  const parts: { href: string; label: string }[] = activeModule
    ? [
        { href: activeModule.href, label: activeModule.label },
        ...(child ? [{ href: child.href, label: child.label }] : []),
      ]
    : [...context!];
  // Never infer display text from untrusted URL segments. Route owners
  // may supply a verified title tied to the exact pathname.
  const title = trustedPageTitle(pathname, page);
  if (parts[parts.length - 1]?.href !== pathname) {
    parts.push({ href: pathname, label: title ?? "Поточна сторінка" });
  } else if (title) {
    parts[parts.length - 1] = { href: pathname, label: title };
  }
  return parts;
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
