import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  viewer: vi.fn(),
  query: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/features/auth/session-data", () => ({
  loadSessionViewer: mocks.viewer,
}));
vi.mock("@/lib/apollo/rsc-client", () => ({
  getClient: () => ({ query: mocks.query }),
}));
vi.mock("@/gql/graphql", () => ({
  PublicProfileDocument: "public-profile",
  ProfileWallDocument: "profile-wall",
  UserActivityDocument: "user-activity",
  ProfileGamificationDocument: "profile-gamification",
  ProfileSettingsDocument: "profile-settings",
  MembersDirectoryDocument: "members-directory",
}));

import { loadPublicProfile } from "./profile-data";

const profile = { id: "owner", username: "developer", displayName: "Developer" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookies.mockResolvedValue({
    get: (name: string) =>
      name === "dss_access_token" ? { value: "stale-or-valid-token" } : undefined,
  });
});

describe("public profile session and optional projections", () => {
  it("loads a public profile as a guest when a cookie has no valid viewer", async () => {
    mocks.viewer.mockResolvedValue(null);
    mocks.query.mockResolvedValueOnce({ data: { userByUsername: profile } });

    const result = await loadPublicProfile("developer");

    expect(result).toEqual({
      profile,
      viewerId: "",
      wall: undefined,
      activity: undefined,
      gamification: undefined,
    });
    expect(mocks.query).toHaveBeenCalledOnce();
    expect(mocks.query.mock.calls[0]?.[0].context).toEqual({});
    expect(mocks.cookies).not.toHaveBeenCalled();
  });

  it("uses the validated viewer without querying identity again", async () => {
    mocks.viewer.mockResolvedValue({ id: "viewer", username: "member" });
    mocks.query
      .mockResolvedValueOnce({ data: { userByUsername: profile } })
      .mockResolvedValueOnce({ data: { profileWall: { items: [] } } })
      .mockResolvedValueOnce({ data: { userActivity: { items: [] } } })
      .mockResolvedValueOnce({ data: { levelProgress: { currentLevel: 1 } } });

    const result = await loadPublicProfile("developer");

    expect(result.viewerId).toBe("viewer");
    expect(result.wall).toEqual({ items: [] });
    expect(result.activity).toEqual({ items: [] });
    expect(result.gamification).toEqual({
      levelProgress: { currentLevel: 1 },
    });
    expect(mocks.query).toHaveBeenCalledTimes(4);
    expect(mocks.query.mock.calls[0]?.[0].context).toEqual({
      headers: { authorization: "Bearer stale-or-valid-token" },
    });
    expect(mocks.query.mock.calls[1]?.[0].query).toBe("profile-wall");
    expect(mocks.query.mock.calls[2]?.[0].query).toBe("user-activity");
    expect(mocks.query.mock.calls[3]?.[0].query).toBe("profile-gamification");
  });

  it("keeps the profile and healthy widgets available when a secondary query fails", async () => {
    mocks.viewer.mockResolvedValue({ id: "viewer", username: "member" });
    mocks.query
      .mockResolvedValueOnce({ data: { userByUsername: profile } })
      .mockRejectedValueOnce(new Error("Wall unavailable"))
      .mockResolvedValueOnce({ data: { userActivity: { items: [1] } } })
      .mockRejectedValueOnce(new Error("Progress unavailable"));

    const result = await loadPublicProfile("developer");

    expect(result.profile).toEqual(profile);
    expect(result.viewerId).toBe("viewer");
    expect(result.wall).toBeUndefined();
    expect(result.activity).toEqual({ items: [1] });
    expect(result.gamification).toBeUndefined();
  });

  it("does not treat a missing or denied primary profile as available", async () => {
    mocks.viewer.mockResolvedValue(null);
    mocks.query.mockResolvedValueOnce({ data: { userByUsername: null } });

    await expect(loadPublicProfile("hidden")).rejects.toThrow("PROFILE_NOT_FOUND");
    expect(mocks.query).toHaveBeenCalledOnce();
  });

  it("does not fetch secondary private data when the primary profile query fails", async () => {
    mocks.viewer.mockResolvedValue({ id: "viewer", username: "member" });
    mocks.query.mockRejectedValueOnce(new Error("Forbidden"));

    await expect(loadPublicProfile("hidden")).rejects.toThrow("Forbidden");
    expect(mocks.query).toHaveBeenCalledOnce();
  });
});
