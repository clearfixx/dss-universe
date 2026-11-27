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
  it("names horizontal navigation links", () => {
    const html = renderToStaticMarkup(
      createElement(GlobalNavigation, {
        pathname: "/news/en/article",
        variant: "HORIZONTAL_NAVIGATION",
        hasSession: false,
        canAccessAdminDeck: false,
      }),
    );

    expect(html).toContain('href="/news"');
    expect(html).toContain('aria-label="Новини"');
    expect(html).toContain('title="Новини"');
    expect(html).toContain('aria-current="location"');
    expect(html).not.toContain('href="/command-deck"');
  });

  it("announces the desktop module menu", () => {
    const html = renderToStaticMarkup(
      createElement(GlobalNavigation, {
        pathname: "/news",
        variant: "MODULE_LAUNCHER",
        hasSession: false,
        canAccessAdminDeck: false,
      }),
    );

    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
  });

  it("names links for the hybrid featured navigation", () => {
    const html = renderToStaticMarkup(
      createElement(GlobalNavigation, {
        pathname: "/members",
        variant: "HYBRID",
        hasSession: true,
        canAccessAdminDeck: false,
      }),
    );

    expect(html).toContain('aria-haspopup="menu"');
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
  it("renders a route-owned trail with the last item as the current page", () => {
    const html = renderToStaticMarkup(
      createElement(Breadcrumbs, {
        pathname: "/community/forum/topics/t1",
        trail: [
          { href: "/community", label: "Спільнота" },
          { href: "/community/forum/f1", label: "Next.js" },
          { href: "/community/forum/topics/t1", label: "Тема" },
        ],
      }),
    );
    expect(html).toContain('href="/community"');
    expect(html).toContain('href="/community/forum/f1"');
    expect(html).not.toContain('href="/community/forum/topics/t1"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('aria-label="DSS Universe"');
  });

  it("accepts a non-link final crumb when verified against the active pathname", () => {
    const html = renderToStaticMarkup(createElement(Breadcrumbs, {
      pathname: "/community/moderation/trash",
      pageTitle: { pathname: "/community/moderation/trash", title: "Кошик" },
      trail: [
        { href: "/community", label: "Спільнота" },
        { label: "Модерація" },
        { label: "Кошик" },
      ],
    }));
    expect(html).toContain("Модерація");
    expect(html).toContain("Кошик");
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain('href="/community/moderation/trash"');
  });

  it("rejects a non-link final crumb with stale route metadata", () => {
    const html = renderToStaticMarkup(createElement(Breadcrumbs, {
      pathname: "/community/moderation/sanctions",
      pageTitle: { pathname: "/community/moderation/trash", title: "Кошик" },
      trail: [{ label: "Кошик" }],
    }));
    expect(html).not.toContain("Кошик");
    expect(html).toContain("Поточна сторінка");
  });

  it("rejects a route-owned trail from a different pathname", () => {
    const html = renderToStaticMarkup(createElement(Breadcrumbs, {
      pathname: "/community/forum/topics/t2",
      trail: [{ href: "/community/forum/topics/t1", label: "Stale topic" }],
    }));
    expect(html).not.toContain("Stale topic");
    expect(html).toContain("Поточна сторінка");
  });
});

describe("navigation composition contract", () => {
  for (const variant of ["MODULE_LAUNCHER", "HORIZONTAL_NAVIGATION", "HYBRID"] as const) {
    it(`preserves launcher access for ${variant}`, () => {
      const html = renderToStaticMarkup(createElement(GlobalNavigation, {
        pathname: "/news",
        variant,
        hasSession: true,
        canAccessAdminDeck: false,
      }));
      expect(html).toContain('aria-haspopup="menu"');
      expect(html).not.toContain('href="/command-deck"');
      expect(html.includes('href="/news"')).toBe(variant !== "MODULE_LAUNCHER");
      expect(html.includes('href="/media"')).toBe(variant === "HORIZONTAL_NAVIGATION");
    });
  }

  it("keeps future module labels non-navigable", () => {
    const html = renderToStaticMarkup(createElement(GlobalNavigation, {
      pathname: "/news",
      variant: "HORIZONTAL_NAVIGATION",
      hasSession: true,
      canAccessAdminDeck: true,
      onOpenLauncher: () => {},
    }));
    expect(html).toContain("Академія");
    expect(html).toContain("(скоро)");
    expect(html).not.toContain('href="/academy"');
    expect(html).toContain('href="/command-deck"');
  });
});
