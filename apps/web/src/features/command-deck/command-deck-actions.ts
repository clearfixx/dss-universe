"use server";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/command-deck-actions.ts
 *
 * 🎯 Purpose:
 * Server actions behind "Зберегти зміни" and the other Command Deck ›
 * Community Hub controls.
 *
 * ⚠️ Important:
 * Each action returns { ok, data } or { ok: false, error } with a
 * user-facing message; the API enforces every permission and rule.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

import {
  forumResult,
  ForumSignInRequired,
  type ForumResult,
} from "@/features/forum/forum-errors";
import {
  AssignForumCategoryModeratorDocument,
  AssignForumModeratorDocument,
  CommandDeckMemberLookupDocument,
  CreateForumCategoryDocument,
  CreateForumDocument,
  RevokeForumModeratorDocument,
  SaveForumSettingsDocument,
  UpdateModerationSanctionPolicyDocument,
  type ForumCategoryInput,
  type ForumInput,
  type ModerationSanctionPolicyInput,
  type SaveForumSettingsInput,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

const ADMIN_PATH = "/command-deck/community-hub";

async function signedIn() {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new ForumSignInRequired();
  return { headers: { authorization: `Bearer ${token}` } };
}

async function run<TData, TVariables extends Record<string, unknown>, R>(
  mutation: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  pick: (data: TData) => R,
): Promise<ForumResult<R>> {
  return forumResult(async () => {
    const result = await getClient().mutate({
      mutation,
      variables,
      context: await signedIn(),
    });
    if (!result.data)
      throw new Error("Command Deck mutation returned no data.");
    revalidatePath(ADMIN_PATH, "layout");
    revalidatePath("/community", "layout");
    return pick(result.data);
  });
}

export async function saveForumSettings(input: SaveForumSettingsInput) {
  return run(
    SaveForumSettingsDocument,
    { input },
    (d) => d.saveForumSettings.length,
  );
}

export async function createForumCategory(input: ForumCategoryInput) {
  return run(
    CreateForumCategoryDocument,
    { input },
    (d) => d.createForumCategory.id,
  );
}

export async function createForum(input: ForumInput) {
  return run(CreateForumDocument, { input }, (d) => d.createForum.id);
}

export async function updateSanctionPolicy(
  input: ModerationSanctionPolicyInput,
) {
  return run(
    UpdateModerationSanctionPolicyDocument,
    { input },
    (d) => d.updateModerationSanctionPolicy.escalationWarningCount,
  );
}

export async function assignForumModerator(
  categoryId: string,
  forumId: string,
  moderatorId: string,
) {
  return run(
    AssignForumModeratorDocument,
    { categoryId, forumId, moderatorId },
    (d) => d.assignForumModerator.id,
  );
}

/** Whole-category moderator (P1 C02); the API checks forum.moderators.assign. */
export async function assignForumCategoryModerator(
  categoryId: string,
  moderatorId: string,
) {
  return run(
    AssignForumCategoryModeratorDocument,
    { categoryId, moderatorId },
    (d) => d.assignForumCategoryModerator.id,
  );
}

export async function revokeForumModerator(assignmentId: string) {
  return run(
    RevokeForumModeratorDocument,
    { assignmentId },
    (d) => d.revokeForumCategoryModerator.id,
  );
}

export async function lookupMembers(search: string) {
  return forumResult(async () => {
    const term = search.trim();
    if (term.length < 2) return [];
    const result = await getClient().query({
      query: CommandDeckMemberLookupDocument,
      variables: { search: term },
      context: await signedIn(),
      fetchPolicy: "no-cache",
    });
    return result.data?.members.items ?? [];
  });
}
