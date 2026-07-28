/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Settings Frontend
 * 📄 File: apps/web/src/features/settings/profile-settings-view.spec.tsx
 *
 * 🎯 Purpose:
 * Verifies owner settings coverage for profile, privacy and active sessions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProfileSettingsQuery } from "@/gql/graphql";

vi.mock("../profile/profile-actions", () => ({
  changeViewerEmail: vi.fn(),
  changeViewerPassword: vi.fn(),
  deactivateViewerAccount: vi.fn(),
  removeViewerMedia: vi.fn(),
  revokeOtherSessions: vi.fn(),
  revokeSession: vi.fn(),
  updateViewerMedia: vi.fn(),
  updateNotificationSettings: vi.fn(),
  updatePrivacySettings: vi.fn(),
  updateProfileSettings: vi.fn(),
}));

import { ProfileSettingsView } from "./profile-settings-view";

const settings: ProfileSettingsQuery = {
  viewer: {
    id: "user-1",
    username: "astro",
    displayName: "Astro DSS",
    email: "astro@example.com",
    bio: "Building the Universe.",
    location: "Kyiv",
    website: "https://dss.example",
    technologies: ["TypeScript"],
    interests: ["Architecture"],
    avatarUrl: null,
    coverUrl: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    socialLinks: [],
  },
  viewerPrivacySettings: {
    profileVisibility: "PUBLIC",
    showLocation: true,
    showWebsite: true,
    showSocialLinks: true,
    showLastSeen: true,
    showOnlineStatus: true,
    allowFollowers: true,
    showFollows: true,
    allowWallPosts: true,
  },
  viewerProfileCompletion: {
    percentage: 75,
    completedCount: 6,
    totalCount: 8,
    isComplete: false,
    completedFields: ["BIO"],
    missingFields: ["AVATAR", "COVER"],
  },
  viewerSessions: [
    {
      id: "session-1",
      current: true,
      userAgent: "DSS Test Browser",
      ipAddress: "127.0.0.1",
      createdAt: "2026-07-28T12:00:00.000Z",
      expiresAt: "2026-08-28T12:00:00.000Z",
    },
  ],
  viewerNotificationPreferences: {
    inAppCategories: ["MENTIONS"],
    emailEnabled: true,
    emailCategories: ["MENTIONS"],
    digestFrequency: "WEEKLY",
  },
};

describe("ProfileSettingsView", () => {
  it("renders completion, owner controls and the current session", () => {
    render(<ProfileSettingsView settings={settings} />);

    expect(
      screen.getByRole("heading", { name: "Налаштування профілю" }),
    ).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Astro DSS")).toBeInTheDocument();
    expect(screen.getByText("DSS Test Browser")).toBeInTheDocument();
    expect(screen.getByText("Поточна")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Переглянути профіль" }),
    ).toHaveAttribute("href", "/profile/astro");
  });
});

/**
 * Settings protect the astronaut; tests protect the settings.
 */
