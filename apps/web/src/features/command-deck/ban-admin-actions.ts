"use server";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/ban-admin-actions.ts
 *
 * 🎯 Purpose:
 * Administrator actions of permanent bans: ban, lift, decide an appeal and
 * open one of its screenshots.
 *
 * ⚠️ Important:
 * The API checks moderation.bans.manage and who may be banned.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { siteConfig } from "@/config/site.config";
import {
  ForumSignInRequired,
  forumResult,
  type ForumResult,
} from "@/features/forum/forum-errors";
import {
  AdminBanAppealFileAccessDocument,
  DecideBanAppealDocument,
  IssueAccountBanDocument,
  LiftAccountBanDocument,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

async function signedIn() {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new ForumSignInRequired();
  return { headers: { authorization: `Bearer ${token}` } };
}

/** Bans the author of a forum post for a community rule. */
export async function banForumAuthor(input: {
  subjectId: string;
  ruleId: string;
  comment: string;
  postId: string;
}): Promise<ForumResult<null>> {
  return forumResult(async () => {
    await getClient().mutate({
      mutation: IssueAccountBanDocument,
      variables: {
        input: {
          subjectId: input.subjectId,
          ruleId: input.ruleId,
          comment: input.comment,
          context: {
            type: "forum.post",
            id: input.postId,
            path: `/community/forum/posts/${input.postId}`,
          },
        },
      },
      context: await signedIn(),
    });
    return null;
  });
}

export async function liftBan(
  banId: string,
  reason: string,
): Promise<ForumResult<null>> {
  const result = await forumResult(async () => {
    await getClient().mutate({
      mutation: LiftAccountBanDocument,
      variables: { banId, reason },
      context: await signedIn(),
    });
    return null;
  });
  if (result.ok) revalidatePath("/command-deck/moderation/bans");
  return result;
}

export async function decideAppeal(
  appealId: string,
  accept: boolean,
  reason: string,
): Promise<ForumResult<null>> {
  const result = await forumResult(async () => {
    await getClient().mutate({
      mutation: DecideBanAppealDocument,
      variables: { appealId, accept, reason },
      context: await signedIn(),
    });
    return null;
  });
  if (result.ok) revalidatePath("/command-deck/moderation/appeals");
  return result;
}

/** A short-lived link to one re-encoded appeal screenshot. */
export async function openAppealScreenshot(
  appealId: string,
  fileId: string,
): Promise<ForumResult<string>> {
  return forumResult(async () => {
    const result = await getClient().query({
      query: AdminBanAppealFileAccessDocument,
      variables: { appealId, fileId },
      context: await signedIn(),
      fetchPolicy: "no-cache",
    });
    const path = result.data?.banAppealFileAccess.url;
    if (!path) throw new Error("The screenshot is not available.");
    // The API returns a path on its own origin.
    return new URL(path, siteConfig.apiUrl).toString();
  });
}
