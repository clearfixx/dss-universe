"use server";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-network-actions.ts
 *
 * 🎯 Purpose:
 * Staff actions for post network metadata (P1 B11): read IP+UA (each read
 * is audited by the API) and erase them with a reason.
 *
 * ⚠️ Important:
 * Nothing is cached: every open of the dialog is one audited read.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { cookies } from "next/headers";

import {
  DeleteForumPostNetworkDocument,
  ForumPostNetworkDocument,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

import { ForumSignInRequired, forumResult } from "./forum-errors";

async function signedIn() {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new ForumSignInRequired();
  return { headers: { authorization: `Bearer ${token}` } };
}

export async function readForumPostNetwork(postId: string) {
  return forumResult(async () => {
    const result = await getClient().query({
      query: ForumPostNetworkDocument,
      variables: { postId },
      context: await signedIn(),
      fetchPolicy: "no-cache",
    });
    return result.data?.forumPostNetwork ?? null;
  });
}

export async function eraseForumPostNetwork(postId: string, reason: string) {
  return forumResult(async () => {
    const result = await getClient().mutate({
      mutation: DeleteForumPostNetworkDocument,
      variables: { postId, reason },
      context: await signedIn(),
    });
    return result.data?.deleteForumPostNetwork ?? false;
  });
}
