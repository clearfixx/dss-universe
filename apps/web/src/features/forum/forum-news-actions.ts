"use server";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-news-actions.ts
 *
 * 🎯 Purpose:
 * News ↔ forum (P1 A12): find a topic, link it to a news article as its
 * discussion, or unlink it.
 *
 * ⚠️ Important:
 * The API allows only the article author or a moderator of the topic's
 * category and audits each link; refusals come back as ForumResult errors.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  ForumTopicPickerDocument,
  LinkNewsDiscussionDocument,
  UnlinkNewsDiscussionDocument,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

import { ForumSignInRequired, forumResult } from "./forum-errors";

async function signedIn() {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new ForumSignInRequired();
  return { headers: { authorization: `Bearer ${token}` } };
}

/** Topics matching a term, for the link dialog (visibility is the API's). */
export async function findForumTopics(term: string) {
  return forumResult(async () => {
    const value = term.trim().slice(0, 100);
    if (value.length < 2) return [];
    const result = await getClient().query({
      query: ForumTopicPickerDocument,
      variables: { term: value },
      context: await signedIn(),
      fetchPolicy: "no-cache",
    });
    return (result.data?.search.items ?? []).map(({ id, title }) => ({
      id,
      title,
    }));
  });
}

export async function linkNewsDiscussion(
  articleId: string,
  topicId: string,
  articlePath: string,
) {
  return forumResult(async () => {
    await getClient().mutate({
      mutation: LinkNewsDiscussionDocument,
      variables: { articleId, topicId },
      context: await signedIn(),
    });
    revalidatePath(articlePath);
    return true;
  });
}

export async function unlinkNewsDiscussion(
  articleId: string,
  articlePath: string,
) {
  return forumResult(async () => {
    await getClient().mutate({
      mutation: UnlinkNewsDiscussionDocument,
      variables: { articleId },
      context: await signedIn(),
    });
    revalidatePath(articlePath);
    return true;
  });
}
