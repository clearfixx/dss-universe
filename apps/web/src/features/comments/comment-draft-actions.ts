/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Comments Frontend
 * 📄 File: apps/web/src/features/comments/comment-draft-actions.ts
 *
 * 🎯 Purpose:
 * Connects Comments-owned draft lifecycle commands to authenticated GraphQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use server";

import { cookies } from "next/headers";

import {
  DiscardCommentDraftDocument,
  SaveCommentDraftDocument,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

export type CommentDraftRecord = {
  id: string;
  interactionTargetId: string;
  parentId: string | null;
  documentJson: string;
  plainText: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

async function authenticatedContext(): Promise<{
  headers: { authorization: string };
}> {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new Error("Authentication is required.");
  return { headers: { authorization: `Bearer ${token}` } };
}

export async function saveCommentDraft(input: {
  interactionTargetId: string;
  parentId: string | null;
  documentJson: string;
  baseVersion: number;
}): Promise<CommentDraftRecord> {
  const result = await getClient().mutate({
    mutation: SaveCommentDraftDocument,
    variables: { input },
    context: await authenticatedContext(),
  });
  const draft = result.data?.saveCommentDraft;
  if (!draft) throw new Error("Comment draft was not saved.");
  return draft;
}

export async function discardCommentDraft(draftId: string): Promise<void> {
  const result = await getClient().mutate({
    mutation: DiscardCommentDraftDocument,
    variables: { draftId },
    context: await authenticatedContext(),
  });
  if (!result.data?.discardCommentDraft) {
    throw new Error("Comment draft was not discarded.");
  }
}

/** Access tokens stay server-side; drafts stay private to their author. */
