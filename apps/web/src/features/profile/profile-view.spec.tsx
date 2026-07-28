/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Frontend
 * 📄 File: apps/web/src/features/profile/profile-view.spec.tsx
 *
 * 🎯 Purpose:
 * Verifies the Phase 7 public profile, wall and social presentation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ProfileWallQuery,
  PublicProfileQuery,
  UserActivityQuery,
} from "@/gql/graphql";
import { useProfileUiStore } from "@/stores/profile-ui.store";

vi.mock("./profile-actions", () => ({
  createWallPost: vi.fn(),
  setProfileFollowState: vi.fn(),
}));

import { ProfileView } from "./profile-view";

const profile: PublicProfileQuery["userByUsername"] = {
  id: "user-1",
  username: "astro",
  displayName: "Astro DSS",
  bio: "Будую DSS Universe.",
  location: "Kyiv",
  website: "https://dss.example",
  technologies: ["TypeScript", "NestJS"],
  interests: ["Architecture"],
  avatarUrl: null,
  coverUrl: null,
  followerCount: 42,
  followingCount: 12,
  isFollowedByViewer: false,
  isOnline: true,
  lastSeenAt: "2026-07-28T12:00:00.000Z",
  createdAt: "2025-01-01T00:00:00.000Z",
  socialLinks: [],
};

const wall: ProfileWallQuery["profileWall"] = {
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
  items: [
    {
      id: "post-1",
      profileOwnerId: "user-1",
      authorId: "user-1",
      body: "Перший запис у профілі.",
      imageMediaId: null,
      isDeleted: false,
      deletedAt: null,
      createdAt: "2026-07-28T12:00:00.000Z",
      updatedAt: "2026-07-28T12:00:00.000Z",
    },
  ],
};

const activity: UserActivityQuery["userActivity"] = {
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
  items: [
    {
      id: "activity-1",
      actorId: "user-1",
      module: "users",
      action: "users.profile-wall.post-created.v1",
      subjectType: "profile-wall-post",
      subjectId: "post-1",
      occurredAt: "2026-07-28T12:00:00.000Z",
    },
  ],
};

describe("ProfileView", () => {
  beforeEach(() => {
    useProfileUiStore.setState({ activeTab: "overview" });
  });

  it("renders owner profile data, wall content and Phase 8 boundary", () => {
    render(
      <ProfileView
        viewerId="user-1"
        profile={profile}
        wall={wall}
        activity={activity}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Astro DSS" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Будую DSS Universe.")).toBeInTheDocument();
    expect(screen.getByText("Перший запис у профілі.")).toBeInTheDocument();
    expect(screen.getByText("Відкриється у Phase 8")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Редагувати профіль/ }),
    ).toHaveAttribute("href", "/settings/profile");
  });
});

/**
 * The profile may travel through the Universe, but its contracts stay typed.
 */
