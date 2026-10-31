import { describe, expect, it } from "vitest";

import {
  DEFAULT_SHELL_VARIANT,
  MODULE_NAVIGATION,
  SHELL_VARIANTS,
  breadcrumbsForPath,
  currentModule,
  currentSidebarHref,
  isShellVariant,
  moduleSidebarItems,
  navigationCurrent,
  routeMatches,
  visibleModules,
} from "./shell-navigation";

describe("application shell navigation contracts", () => {
  it("only accepts supported shell variants", () => {
    expect(SHELL_VARIANTS).toEqual([
      "MODULE_LAUNCHER",
      "HORIZONTAL_NAVIGATION",
      "HYBRID",
    ]);
    expect(isShellVariant(DEFAULT_SHELL_VARIANT)).toBe(true);
    expect(isShellVariant("CUSTOM")).toBe(false);
    expect(isShellVariant({ variant: "HYBRID" })).toBe(false);
  });

  it("keeps module routes unique and identifies nested routes", () => {
    const hrefs = MODULE_NAVIGATION.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).not.toContain("/research");
    expect(hrefs).not.toContain("/academy");
    expect(currentModule("/newsroom/new")?.href).toBe("/newsroom");
    expect(currentModule("/news/en/article")?.href).toBe("/news");
    expect(currentModule("/unknown")).toBeNull();
    expect(routeMatches("/newsroom", "/news")).toBe(false);
  });

  it("distinguishes the current page from its ancestor module", () => {
    expect(navigationCurrent("/news", "/news")).toBe("page");
    expect(navigationCurrent("/news/en/article", "/news")).toBe("location");
    expect(navigationCurrent("/newsroom/new", "/newsroom")).toBe("location");
    expect(navigationCurrent("/newsroom", "/news")).toBeUndefined();
    expect(navigationCurrent("/unknown", "/news")).toBeUndefined();
  });

  it("builds contextual, not global, sidebar navigation", () => {
    expect(moduleSidebarItems("/newsroom/new").map((item) => item.href)).toEqual([
      "/newsroom",
      "/newsroom/new",
    ]);
    expect(moduleSidebarItems("/newsroom").map((item) => item.href)).toEqual([
      "/newsroom",
      "/newsroom/new",
    ]);
    expect(moduleSidebarItems("/media")).toHaveLength(1);
    expect(moduleSidebarItems("/unknown")).toEqual([]);
  });

  it("selects one deepest current Sidebar destination", () => {
    expect(currentSidebarHref("/newsroom")).toBe("/newsroom");
    expect(currentSidebarHref("/newsroom/new")).toBe("/newsroom/new");
    expect(currentSidebarHref("/newsroom/new/preview")).toBe("/newsroom/new");
    expect(currentSidebarHref("/news/en/article")).toBe("/news");
    expect(currentSidebarHref("/unknown")).toBeNull();
  });

  it("keeps private destinations out of guest navigation", () => {
    const guestRoutes = visibleModules(false).map((entry) => entry.href);
    expect(guestRoutes).toContain("/news");
    expect(guestRoutes).not.toContain("/command-deck");
    expect(guestRoutes).not.toContain("/newsroom");
    expect(guestRoutes).not.toContain("/settings/profile");
    expect(visibleModules(true).map((entry) => entry.href)).not.toContain(
      "/command-deck",
    );
    expect(visibleModules(true, true).map((entry) => entry.href)).toContain(
      "/command-deck",
    );
    expect(visibleModules(true, true)).toHaveLength(MODULE_NAVIGATION.length);
  });

  it("finishes dynamic breadcrumb trails without inventing route titles", () => {
    expect(breadcrumbsForPath("/news/en/article-slug")).toEqual([
      { href: "/news", label: "Новини" },
      { href: "/news/en/article-slug", label: "Поточна сторінка" },
    ]);
    expect(breadcrumbsForPath("/newsroom/new/preview")).toEqual([
      { href: "/newsroom", label: "Newsroom" },
      { href: "/newsroom/new", label: "Нова стаття" },
      { href: "/newsroom/new/preview", label: "Поточна сторінка" },
    ]);
    expect(breadcrumbsForPath("/unknown")).toEqual([]);
    expect(breadcrumbsForPath("/news")).toEqual([
      { href: "/news", label: "Новини" },
    ]);
  });

  it("uses declared labels for known breadcrumbs", () => {
    expect(breadcrumbsForPath("/newsroom/new")).toEqual([
      { href: "/newsroom", label: "Newsroom" },
      { href: "/newsroom/new", label: "Нова стаття" },
    ]);
  });
});
