import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    "aria-label"?: string;
    title?: string;
  }) => createElement("a", { href, ...props }, children),
}));

import { Breadcrumbs, GlobalNavigation } from "./dss-application-shell";

describe("global navigation accessibility", () => {
  it("names icon-only links at intermediate desktop widths", () => {
    const html = renderToStaticMarkup(
      createElement(GlobalNavigation, {
        pathname: "/news/en/article",
        variant: "HORIZONTAL_NAVIGATION",
        hasSession: false,
        canAccessAdminDeck: false,
        onOpenLauncher: () => {},
      }),
    );

    expect(html).toContain('href="/news"');
    expect(html).toContain('aria-label="Новини"');
    expect(html).toContain('title="Новини"');
    expect(html).toContain('aria-current="location"');
    expect(html).not.toContain('href="/command-deck"');
  });

  it("announces an open desktop module launcher", () => {
    const html = renderToStaticMarkup(
      createElement(GlobalNavigation, {
        pathname: "/news",
        variant: "MODULE_LAUNCHER",
        hasSession: false,
        canAccessAdminDeck: false,
        onOpenLauncher: () => {},
        launcherOpen: true,
      }),
    );

    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="true"');
  });

  it("names links for the hybrid featured navigation", () => {
    const html = renderToStaticMarkup(
      createElement(GlobalNavigation, {
        pathname: "/members",
        variant: "HYBRID",
        hasSession: true,
        canAccessAdminDeck: false,
        onOpenLauncher: () => {},
      }),
    );

    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Учасники"');
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain('href="/command-deck"');
  });
});


describe("breadcrumb rendering", () => {
  it("renders a verified dynamic title as the current page, not a fabricated link", () => {
    const html = renderToStaticMarkup(
      createElement(Breadcrumbs, {
        pathname: "/news/uk/article",
        pageTitle: { pathname: "/news/uk/article", title: "Назва новини" },
      }),
    );
    expect(html).toContain('aria-label="Навігаційний шлях"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Назва новини");
    expect(html).toContain('href="/news"');
    expect(html).not.toContain('href="/news/uk/article"');
  });

  it("ignores stale route metadata after a navigation", () => {
    const html = renderToStaticMarkup(
      createElement(Breadcrumbs, {
        pathname: "/news/uk/next",
        pageTitle: { pathname: "/news/uk/previous", title: "Previous article" },
      }),
    );
    expect(html).toContain("Поточна сторінка");
    expect(html).not.toContain("Previous article");
  });

  it("omits breadcrumbs for paths without registered shell metadata", () => {
    expect(renderToStaticMarkup(createElement(Breadcrumbs, {
      pathname: "/unregistered/route",
    }))).toBe("");
  });
  it("renders profile and protected settings breadcrumbs with semantic current page", () => {
    const profile = renderToStaticMarkup(
      createElement(Breadcrumbs, {
        pathname: "/profile/developer",
        pageTitle: { pathname: "/profile/developer", title: "Developer Name" },
      }),
    );
    expect(profile).toContain("Developer Name");
    expect(profile).toContain('aria-current="page"');
    expect(profile).not.toContain('href="/profile/developer"');

    const settings = renderToStaticMarkup(
      createElement(Breadcrumbs, { pathname: "/settings/platform-appearance" }),
    );
    expect(settings).toContain('href="/settings/profile"');
    expect(settings).toContain("Оформлення платформи");
    expect(settings).toContain('aria-current="page"');
    expect(settings).not.toContain('href="/settings/platform-appearance"');
  });

});
