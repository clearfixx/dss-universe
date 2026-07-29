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
  ProfileGamificationQuery,
  PublicProfileQuery,
  UserActivityQuery,
} from "@/gql/graphql";
import { useProfileUiStore } from "@/stores/profile-ui.store";

vi.mock("./profile-actions", () => ({
  createWallPost: vi.fn(),
  giveProfileReputation: vi.fn(),
  selectViewerCustomTitle: vi.fn(),
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

const gamification: ProfileGamificationQuery = {
  levelProgress: {
    balance: 1250,
    currentLevel: 8,
    currentThreshold: 1000,
    nextLevel: 9,
    nextThreshold: 1500,
    pointsIntoLevel: 250,
    pointsNeeded: 250,
    progressPercent: 50,
  },
  communityPointsHistory: {
    balance: 1250,
    total: 1,
    items: [
      {
        id: "points-1",
        points: 50,
        reason: "Опубліковано статтю.",
        ruleKey: "knowledge.article.published",
        occurredAt: "2026-07-28T12:00:00.000Z",
      },
    ],
  },
  reputationHistory: {
    score: 42,
    total: 1,
    items: [
      {
        id: "reputation-1",
        value: 1,
        reason: "Корисна відповідь.",
        createdAt: "2026-07-28T12:00:00.000Z",
        actor: {
          id: "actor-1",
          username: "mission-control",
          displayName: "Mission Control",
          avatarUrl: null,
        },
      },
    ],
  },
  userAchievements: [
    {
      id: "award-1",
      awardedAt: "2026-07-28T12:00:00.000Z",
      reason: "Завершив першу місію.",
      achievement: {
        id: "achievement-1",
        key: "first.mission",
        name: "Перша місія",
        description: "Перший крок у DSS.",
        color: "#22D3EE",
        badge: "🚀",
      },
    },
  ],
  userCustomTitles: [
    {
      id: "grant-1",
      selected: true,
      grantedAt: "2026-07-28T12:00:00.000Z",
      grantReason: "За розвиток платформи.",
      revokedAt: null,
      title: {
        id: "title-1",
        name: "Архітектор знань",
        description: "Будує фундамент DSS.",
        color: "#A78BFA",
        badge: "✦",
        isActive: true,
      },
    },
    {
      id: "grant-2",
      selected: false,
      grantedAt: "2026-07-27T12:00:00.000Z",
      grantReason: "За першу завершену місію.",
      revokedAt: null,
      title: {
        id: "title-2",
        name: "Першопроходець",
        description: "Досліджує нові модулі.",
        color: "#22D3EE",
        badge: "🚀",
        isActive: true,
      },
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
        gamification={gamification}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Astro DSS" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Будую DSS Universe.")).toBeInTheDocument();
    expect(screen.getByText("Перший запис у профілі.")).toBeInTheDocument();
    expect(screen.getByText("Рівень 8 · 1 250 очок")).toBeInTheDocument();
    expect(screen.getAllByText(/Архітектор знань/)).not.toHaveLength(0);
    expect(screen.getByText("Перша місія")).toBeInTheDocument();
    expect(screen.getByText("Опубліковано статтю.")).toBeInTheDocument();
    expect(screen.getByText("Корисна відповідь.")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Звання для відображення" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Редагувати профіль/ }),
    ).toHaveAttribute("href", "/settings/profile");
  });

  it("shows the explained reputation form only to a profile visitor", () => {
    render(
      <ProfileView
        viewerId="visitor-1"
        profile={profile}
        wall={wall}
        activity={activity}
        gamification={gamification}
      />,
    );

    expect(screen.getByText("Змінити репутацію")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Опишіть причину оцінки…"),
    ).toBeRequired();
    expect(
      screen.getByRole("button", { name: "Надіслати оцінку" }),
    ).toBeInTheDocument();
  });
});

/**
 * The profile may travel through the Universe, but its contracts stay typed.
 */
