"use server";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/forum-tags-actions.ts
 *
 * 🎯 Purpose:
 * Command Deck › Community Hub › Теги (P1 C03): list, create and edit the
 * allowed tags of one section through the existing forum tag API.
 *
 * ⚠️ Important:
 * The API decides who may manage tags (section moderators and staff) and
 * validates slugs; refusals come back as ForumResult errors.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { cookies } from "next/headers";

import {
  ForumSignInRequired,
  forumResult,
} from "@/features/forum/forum-errors";
import {
  AdminForumTagsDocument,
  CreateAdminForumTagDocument,
  UpdateAdminForumTagDocument,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

export type AdminForumTag = Readonly<{
  id: string;
  slug: string;
  label: string;
  active: boolean;
}>;

export type ForumTagDraft = Readonly<{
  slug: string;
  label: string;
  active: boolean;
}>;

async function signedIn() {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new ForumSignInRequired();
  return { headers: { authorization: `Bearer ${token}` } };
}

export async function listForumTags(forumId: string) {
  return forumResult(async (): Promise<AdminForumTag[]> => {
    const result = await getClient().query({
      query: AdminForumTagsDocument,
      variables: { forumId },
      context: await signedIn(),
      fetchPolicy: "no-cache",
    });
    return [...(result.data?.forumTags ?? [])].sort((a, b) =>
      a.label.localeCompare(b.label, "uk"),
    );
  });
}

export async function createForumTag(forumId: string, input: ForumTagDraft) {
  return forumResult(async (): Promise<AdminForumTag | null> => {
    const result = await getClient().mutate({
      mutation: CreateAdminForumTagDocument,
      variables: { forumId, input },
      context: await signedIn(),
    });
    return result.data?.createForumTag ?? null;
  });
}

export async function updateForumTag(tagId: string, input: ForumTagDraft) {
  return forumResult(async (): Promise<AdminForumTag | null> => {
    const result = await getClient().mutate({
      mutation: UpdateAdminForumTagDocument,
      variables: { tagId, input },
      context: await signedIn(),
    });
    return result.data?.updateForumTag ?? null;
  });
}
