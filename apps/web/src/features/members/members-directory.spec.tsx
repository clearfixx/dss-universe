/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Members Directory Frontend
 * 📄 File: apps/web/src/features/members/members-directory.spec.tsx
 *
 * 🎯 Purpose:
 * Verifies the member directory metrics, discovery table and profile links.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MembersDirectoryQuery } from "@/gql/graphql";

import { MembersDirectory } from "./members-directory";

const data: MembersDirectoryQuery = {
  presenceSummary: {
    onlineMembers: 8,
    onlineGuests: 3,
    onlineCrawlers: 1,
    totalOnline: 12,
    sampledAt: "2026-07-28T12:00:00.000Z",
  },
  members: {
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
    items: [
      {
        id: "user-1",
        username: "astro",
        displayName: "Astro DSS",
        avatarUrl: null,
        isOnline: true,
        roles: ["USER"],
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ],
  },
  leaderboard: {
    period: "ALL_TIME",
    startsAt: null,
    endsAt: "2026-07-29T12:00:00.000Z",
    generatedAt: "2026-07-29T12:00:00.000Z",
    total: 1,
    viewerRank: 1,
    viewerCommunityPoints: 1250,
    items: [
      {
        rank: 1,
        userId: "user-1",
        username: "astro",
        displayName: "Astro DSS",
        avatarUrl: null,
        communityPoints: 1250,
        currentLevel: 8,
        reputation: 42,
        selectedTitle: {
          name: "Архітектор знань",
          color: "#22D3EE",
          badge: "✦",
        },
      },
    ],
  },
};

describe("MembersDirectory", () => {
  it("renders presence metrics and links members to their profiles", () => {
    render(<MembersDirectory data={data} filters={{ sort: "NEWEST" }} />);

    expect(
      screen.getByRole("heading", { name: "Учасники спільноти" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Astro DSS")).toHaveLength(2);
    expect(
      screen.getAllByRole("link", { name: /Astro DSS/ })[0],
    ).toHaveAttribute("href", "/profile/astro");
    expect(screen.getByText("Лідери спільноти")).toBeInTheDocument();
    expect(screen.getByText("1 250 очок")).toBeInTheDocument();
    expect(screen.getByText("Ваша позиція:")).toBeInTheDocument();
  });
});

/**
 * A directory helps astronauts find each other; pagination prevents crowding.
 */
