/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Frontend
 * 📄 File: apps/web/src/features/profile/profile-data.ts
 *
 * 🎯 Purpose:
 * Loads privacy-safe Phase 7 profile, wall, activity, settings and directory
 * projections for React Server Components.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import "server-only";

import { cookies } from "next/headers";

import {
  MembersDirectoryDocument,
  ProfileGamificationDocument,
  ProfileSettingsDocument,
  ProfileWallDocument,
  PublicProfileDocument,
  UserActivityDocument,
  type MembersDirectoryInput,
  type LeaderboardPeriod,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

async function authorizationContext() {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new Error("AUTHENTICATION_REQUIRED");
  return { headers: { authorization: `Bearer ${token}` } };
}

export async function loadPublicProfile(username: string) {
  const context = await authorizationContext();
  const profileResult = await getClient().query({
    query: PublicProfileDocument,
    variables: { username },
    context,
    fetchPolicy: "no-cache",
  });
  const profile = profileResult.data?.userByUsername;
  if (!profile) throw new Error("PROFILE_NOT_FOUND");

  const [wallResult, activityResult, gamificationResult] = await Promise.all([
    getClient().query({
      query: ProfileWallDocument,
      variables: {
        profileOwnerId: profile.id,
        pagination: { page: 1, limit: 10 },
      },
      context,
      fetchPolicy: "no-cache",
    }),
    getClient().query({
      query: UserActivityDocument,
      variables: {
        userId: profile.id,
        pagination: { page: 1, limit: 12 },
      },
      context,
      fetchPolicy: "no-cache",
    }),
    getClient().query({
      query: ProfileGamificationDocument,
      variables: { userId: profile.id },
      context,
      fetchPolicy: "no-cache",
    }),
  ]);

  return {
    viewerId: profileResult.data?.viewer.id ?? "",
    profile,
    wall: wallResult.data?.profileWall,
    activity: activityResult.data?.userActivity,
    gamification: gamificationResult.data,
  };
}

export async function loadProfileSettings() {
  const result = await getClient().query({
    query: ProfileSettingsDocument,
    context: await authorizationContext(),
    fetchPolicy: "no-cache",
  });
  if (!result.data) throw new Error("SETTINGS_UNAVAILABLE");
  return result.data;
}

export async function loadMembersDirectory(
  input: MembersDirectoryInput,
  period: LeaderboardPeriod = "ALL_TIME",
) {
  const result = await getClient().query({
    query: MembersDirectoryDocument,
    variables: {
      input,
      leaderboardInput: { period, page: 1, limit: 3 },
    },
    context: await authorizationContext(),
    fetchPolicy: "no-cache",
  });
  if (!result.data) throw new Error("MEMBERS_UNAVAILABLE");
  return result.data;
}

/**
 * 🔭 Profile data crosses one server-side airlock.
 * Browser components receive projections, never credentials.
 */
