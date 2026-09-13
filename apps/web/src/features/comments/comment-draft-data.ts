/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Comments Frontend
 * 📄 File: apps/web/src/features/comments/comment-draft-data.ts
 *
 * 🎯 Purpose:
 * Loads a private Comments-owned draft at the Server Component boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import "server-only";

import { cookies } from "next/headers";

import { CommentDraftDocument } from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

import type { CommentDraftRecord } from "./comment-draft-actions";

export async function getCommentDraft(
  interactionTargetId: string,
  parentId: string | null,
): Promise<CommentDraftRecord | null> {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) return null;
  const result = await getClient().query({
    query: CommentDraftDocument,
    variables: { interactionTargetId, parentId },
    context: { headers: { authorization: `Bearer ${token}` } },
    fetchPolicy: "no-cache",
  });
  return result.data?.commentDraft ?? null;
}

/** Draft recovery begins on the server, before the editor crosses the airlock. */
