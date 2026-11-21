import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  viewer: vi.fn(),
  activity: vi.fn(),
}));

vi.mock("@/features/auth/session-data", () => ({
  loadSessionViewer: mocks.viewer,
}));
vi.mock("@/features/activity/activity-data", () => ({
  loadViewerActivityFeed: mocks.activity,
}));
vi.mock("@/components/shell/guest-landing", () => ({
  GuestLanding: () => createElement("div", null, "GUEST_LANDING"),
}));
vi.mock("@/components/shell/command-deck-overview", () => ({
  CommandDeckOverview: () => createElement("div", null, "PERSONAL_DASHBOARD"),
}));
vi.mock("@/components/shell/session-application-shell", () => ({
  DssApplicationShell: ({ children }: { children: ReactNode }) =>
    createElement("main", null, children),
}));
vi.mock("@/components/states/async-states", () => ({
  ErrorState: () => createElement("div", null, "SESSION_REQUIRED"),
}));
vi.mock("@/features/newsroom/news-editor-workspace", () => ({
  NewsEditorWorkspace: () => createElement("div", null, "EDITOR_WORKSPACE"),
}));

import HomePage from "./page";
import NewNewsPage from "./newsroom/new/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.activity.mockResolvedValue(null);
});

describe("server-validated session route entry", () => {
  it("renders the guest landing and does not query a private feed without a validated viewer", async () => {
    mocks.viewer.mockResolvedValue(null);

    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("GUEST_LANDING");
    expect(html).not.toContain("PERSONAL_DASHBOARD");
    expect(mocks.activity).not.toHaveBeenCalled();
  });

  it("renders the personal dashboard only after viewer validation", async () => {
    mocks.viewer.mockResolvedValue({ id: "1", username: "reader" });

    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("PERSONAL_DASHBOARD");
    expect(html).not.toContain("GUEST_LANDING");
    expect(mocks.activity).toHaveBeenCalledOnce();
  });

  it("does not mount the editorial workspace when the viewer is unavailable", async () => {
    mocks.viewer.mockResolvedValue(null);

    const html = renderToStaticMarkup(await NewNewsPage());

    expect(html).toContain("SESSION_REQUIRED");
    expect(html).not.toContain("EDITOR_WORKSPACE");
  });

  it("allows a validated user into draft creation without inventing a frontend role gate", async () => {
    mocks.viewer.mockResolvedValue({ id: "1", username: "author" });

    const html = renderToStaticMarkup(await NewNewsPage());

    expect(html).toContain("EDITOR_WORKSPACE");
    expect(html).not.toContain("SESSION_REQUIRED");
  });
});
