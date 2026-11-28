import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ViewerActivityFeedQuery } from "@/gql/graphql";

import { MissionControlOverview } from "./mission-control-overview";

vi.mock("@/features/activity/activity-visit-marker", () => ({
  ActivityVisitMarker: () => null,
}));

afterEach(cleanup);

describe("MissionControlOverview", () => {
  it("shows the personal dashboard without administrative links or fabricated counts", () => {
    const { container } = render(<MissionControlOverview feed={null} />);
    expect(screen.getByRole("heading", { name: "Mission Control" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Новини" })).toHaveAttribute("href", "/news");
    expect(screen.getByRole("link", { name: "Налаштування" })).toHaveAttribute("href", "/settings/profile");
    expect(container.querySelector('a[href="/command-deck"]')).toBeNull();
    expect(screen.queryByText("Панель адміністратора")).not.toBeInTheDocument();
    expect(screen.getByText("Стрічка активності тимчасово недоступна.")).toBeInTheDocument();
    expect(screen.queryByText("Доступні події")).not.toBeInTheDocument();
    expect(container.querySelector('[data-dss-design="v1"]')).not.toBeNull();
  });

  it("distinguishes an empty feed from an unavailable feed", () => {
    const feed: ViewerActivityFeedQuery["viewerActivityFeed"] = {
      items: [],
      total: 0,
      unreadCount: 0,
      lastVisitedAt: null,
      generatedAt: "2026-11-28T05:00:00.000Z",
      recommendationMode: "DEFAULT",
    };
    render(<MissionControlOverview feed={feed} />);
    expect(screen.getByText("Подій поки немає")).toBeInTheDocument();
    expect(screen.getByText("Доступні події")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(2);
    expect(screen.queryByText("Стрічка активності тимчасово недоступна.")).not.toBeInTheDocument();
  });
});
