/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/command-deck-data.ts
 *
 * 🎯 Purpose:
 * Server loaders for Command Deck › Community Hub: the full section tree
 * with settings, hub counters, sanction policy, point rules, a section's
 * role matrix and its moderators.
 *
 * ⚠️ Important:
 * Server only. The API decides access (structure managers); pages also
 * guard with the Command Deck access check.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import "server-only";

import { cookies } from "next/headers";

import {
  CommandDeckCommunityHubDocument,
  CommandDeckModeratorsDocument,
  CommandDeckSectionAccessDocument,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

async function authContext() {
  const token = (await cookies()).get("dss_access_token")?.value;
  return token ? { headers: { authorization: `Bearer ${token}` } } : undefined;
}

export async function loadCommunityHubAdmin() {
  const result = await getClient().query({
    query: CommandDeckCommunityHubDocument,
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  if (!result.data) throw new Error("COMMUNITY_HUB_ADMIN_UNAVAILABLE");
  return result.data;
}

export async function loadSectionAccess(
  scope: { categoryId: string } | { forumId: string },
) {
  const result = await getClient().query({
    query: CommandDeckSectionAccessDocument,
    variables: {
      categoryId: "categoryId" in scope ? scope.categoryId : null,
      forumId: "forumId" in scope ? scope.forumId : null,
    },
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  return result.data?.forumSectionAccess ?? null;
}

export async function loadCategoryModerators(categoryId: string) {
  const result = await getClient().query({
    query: CommandDeckModeratorsDocument,
    variables: { categoryId },
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  return result.data?.forumCategoryModerators ?? [];
}

export type CommunityHubAdmin = Awaited<
  ReturnType<typeof loadCommunityHubAdmin>
>;
export type AdminCategory = CommunityHubAdmin["forumCategories"][number];
export type AdminForum = AdminCategory["forums"][number];
export type AdminSectionAccess = NonNullable<
  Awaited<ReturnType<typeof loadSectionAccess>>
>;
export type AdminModerator = Awaited<
  ReturnType<typeof loadCategoryModerators>
>[number];
