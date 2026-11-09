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

import { GlobalNavigation } from "./dss-application-shell";

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
