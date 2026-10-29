import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Bot,
  Boxes,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  PenLine,
  Users,
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
  /** Prioritized only in the horizontal and hybrid compositions. */
  featured?: boolean;
};

/**
 * A single registry powers every global navigation composition.
 * The route prefixes are intentionally limited to routes already present in the web app.
 * Links are not an authorization boundary; protected routes remain server-enforced.
 */
export const MODULE_NAVIGATION: readonly ModuleNavigation[] = [
  {
    href: "/command-deck",
    label: "Mission Control",
    icon: LayoutDashboard,
    featured: true,
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
    children: [{ href: "/newsroom/new", label: "Нова стаття", icon: PenLine }],
  },
  {
    href: "/members",
    label: "Учасники",
    icon: Users,
    children: [],
  },
  {
    href: "/research",
    label: "Research Lab",
    icon: BookOpen,
    featured: true,
    children: [],
  },
  {
    href: "/community",
    label: "Community Hub",
    icon: MessageSquare,
    featured: true,
    children: [],
  },
  {
    href: "/academy",
    label: "Academy",
    icon: GraduationCap,
    children: [],
  },
  {
    href: "/media",
    label: "Media Platform",
    icon: Boxes,
    children: [],
  },
  {
    href: "/ai",
    label: "AI Core",
    icon: Bot,
    children: [],
  },
] as const;

export function routeMatches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function currentModule(pathname: string): ModuleNavigation | null {
  return (
    MODULE_NAVIGATION.filter((module) => routeMatches(pathname, module.href))
      .sort((a, b) => b.href.length - a.href.length)[0] ?? null
  );
}

/** Contextual sidebar entries, never the complete cross-module registry. */
export function moduleSidebarItems(pathname: string): readonly ModuleNavigationItem[] {
  const module = currentModule(pathname);
  if (!module) return [];
  return [{ href: module.href, label: "Огляд", icon: module.icon }, ...module.children];
}

/** Root routes do not imply content or permissions for placeholder modules. */
export function breadcrumbsForPath(pathname: string): readonly { href: string; label: string }[] {
  const module = currentModule(pathname);
  if (!module) return [];
  const child = module.children.find((item) => routeMatches(pathname, item.href));
  return [
    { href: module.href, label: module.label },
    ...(child ? [{ href: child.href, label: child.label }] : []),
  ];
}
