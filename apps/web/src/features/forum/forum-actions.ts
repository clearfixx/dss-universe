"use server";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-actions.ts
 *
 * 🎯 Purpose:
 * Server actions for members (write, vote, follow, polls) and moderators
 * (topic and post moderation, sanctions).
 *
 * ⚠️ Important:
 * Actions never throw to the client: each returns a ForumResult with a typed
 * error (cooldown, read-only, access, conflict…). Pass `revalidate` with the
 * page path that shows the changed data.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

import {
  AcceptForumAnswerDocument,
  GiveForumPostReputationDocument,
  ReputationJournalDocument,
  ReverseReputationEntryDocument,
  AddForumStaffNoteDocument,
  ForumPostRevisionsDocument,
  ArchiveForumTopicDocument,
  AttachForumTopicPollDocument,
  CastForumPollBallotDocument,
  ClearForumAcceptedAnswerDocument,
  CloseForumTopicDocument,
  CreateForumReplyDocument,
  CreateForumTopicDocument,
  DeleteForumPostDocument,
  EditForumPostDocument,
  HideForumPostDocument,
  MarkForumTopicReadDocument,
  MergeForumTopicsDocument,
  MoveForumPostsDocument,
  MoveForumTopicDocument,
  PurgeForumPostDocument,
  RecordForumTopicViewDocument,
  RemoveForumStaffNoteDocument,
  ReopenForumTopicDocument,
  RestoreForumPostDocument,
  RestoreForumTopicDocument,
  RestrictForumPostAuthorDocument,
  ReverseForumPostVoteDocument,
  SetForumTopicCuratorDocument,
  SetForumTopicPinnedDocument,
  SetForumTopicTagsDocument,
  SplitForumTopicDocument,
  SubscribeForumTopicDocument,
  FollowForumDocument,
  UnfollowForumDocument,
  TrashForumTopicDocument,
  UnarchiveForumTopicDocument,
  UnsubscribeForumTopicDocument,
  VoteForumPostDocument,
  WarnForumPostAuthorDocument,
  type CreateForumReplyInput,
  type CreateForumTopicInput,
  type EditForumPostInput,
  type ForumStaffRole,
  type ForumTopicPollInput,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

import {
  ForumSignInRequired,
  forumResult,
  type ForumResult,
} from "./forum-errors";

async function signedIn() {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new ForumSignInRequired();
  return { headers: { authorization: `Bearer ${token}` } };
}

async function optionalSession() {
  const token = (await cookies()).get("dss_access_token")?.value;
  return token ? { headers: { authorization: `Bearer ${token}` } } : undefined;
}

/** Runs one signed-in mutation, picks its field and revalidates a page. */
async function run<TData, TVariables extends Record<string, unknown>, R>(
  mutation: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  pick: (data: TData) => R,
  revalidate?: string,
): Promise<ForumResult<R>> {
  return forumResult(async () => {
    const result = await getClient().mutate({
      mutation,
      variables,
      context: await signedIn(),
    });
    if (!result.data) throw new Error("Forum mutation returned no data.");
    if (revalidate) revalidatePath(revalidate);
    return pick(result.data);
  });
}

// ── Members ────────────────────────────────────────────────────

export async function createForumTopic(
  input: CreateForumTopicInput,
  revalidate?: string,
) {
  return run(
    CreateForumTopicDocument,
    { input },
    (d) => d.createForumTopic,
    revalidate,
  );
}

export async function createForumReply(
  input: CreateForumReplyInput,
  revalidate?: string,
) {
  return run(
    CreateForumReplyDocument,
    { input },
    (d) => d.createForumReply,
    revalidate,
  );
}

export async function editForumPost(
  input: EditForumPostInput,
  revalidate?: string,
) {
  return run(
    EditForumPostDocument,
    { input },
    (d) => d.editForumPost,
    revalidate,
  );
}

/** `value` is 1 or -1; votes are final. */
export async function voteForumPost(
  postId: string,
  value: 1 | -1,
  revalidate?: string,
) {
  return run(
    VoteForumPostDocument,
    { postId, value },
    (d) => d.voteForumPost,
    revalidate,
  );
}

export async function acceptForumAnswer(
  topicId: string,
  postId: string,
  revalidate?: string,
) {
  return run(
    AcceptForumAnswerDocument,
    { topicId, postId },
    (d) => d.acceptForumAnswer,
    revalidate,
  );
}

export async function closeForumTopic(topicId: string, revalidate?: string) {
  return run(
    CloseForumTopicDocument,
    { topicId },
    (d) => d.closeForumTopic,
    revalidate,
  );
}

export async function reopenForumTopic(topicId: string, revalidate?: string) {
  return run(
    ReopenForumTopicDocument,
    { topicId },
    (d) => d.reopenForumTopic,
    revalidate,
  );
}

export async function setForumTopicFollowed(
  topicId: string,
  followed: boolean,
  revalidate?: string,
) {
  return followed
    ? run(
        SubscribeForumTopicDocument,
        { topicId },
        (d) => d.subscribeForumTopic,
        revalidate,
      )
    : run(
        UnsubscribeForumTopicDocument,
        { topicId },
        (d) => d.unsubscribeForumTopic,
        revalidate,
      );
}

export async function setForumSectionFollowed(
  forumId: string,
  followed: boolean,
  revalidate?: string,
) {
  return followed
    ? run(FollowForumDocument, { forumId }, (d) => d.followForum, revalidate)
    : run(
        UnfollowForumDocument,
        { forumId },
        (d) => d.unfollowForum,
        revalidate,
      );
}

export async function markForumTopicRead(topicId: string, upToNumber: number) {
  return run(
    MarkForumTopicReadDocument,
    { topicId, upToNumber },
    (d) => d.markForumTopicRead,
  );
}

/** Counts a unique signed-in view; guests are ignored by the API. */
export async function recordForumTopicView(topicId: string) {
  const context = await optionalSession();
  if (!context) return;
  try {
    await getClient().mutate({
      mutation: RecordForumTopicViewDocument,
      variables: { topicId },
      context,
    });
  } catch {
    // A view counter must never break reading.
  }
}

export async function castForumPollBallot(
  pollId: string,
  optionIds: string[],
  revalidate?: string,
) {
  return run(
    CastForumPollBallotDocument,
    { input: { pollId, optionIds } },
    (d) => d.castPollBallot,
    revalidate,
  );
}

export async function attachForumTopicPoll(
  topicId: string,
  input: ForumTopicPollInput,
  revalidate?: string,
) {
  return run(
    AttachForumTopicPollDocument,
    { topicId, input },
    (d) => d.attachForumTopicPoll,
    revalidate,
  );
}

export async function setForumTopicTags(
  topicId: string,
  tagIds: string[],
  revalidate?: string,
) {
  return run(
    SetForumTopicTagsDocument,
    { topicId, tagIds },
    (d) => d.setForumTopicTags,
    revalidate,
  );
}

// ── Moderators ─────────────────────────────────────────────────

export async function clearForumAcceptedAnswer(
  topicId: string,
  revalidate?: string,
) {
  return run(
    ClearForumAcceptedAnswerDocument,
    { topicId },
    (d) => d.clearForumAcceptedAnswer,
    revalidate,
  );
}

export async function setForumTopicPinned(
  topicId: string,
  pinned: boolean,
  revalidate?: string,
) {
  return run(
    SetForumTopicPinnedDocument,
    { topicId, pinned },
    (d) => d.setForumTopicPinned,
    revalidate,
  );
}

export async function setForumTopicCurator(
  topicId: string,
  curatorId: string | null,
  revalidate?: string,
) {
  return run(
    SetForumTopicCuratorDocument,
    { topicId, curatorId },
    (d) => d.setForumTopicCurator,
    revalidate,
  );
}

export async function setForumTopicArchived(
  topicId: string,
  archived: boolean,
  revalidate?: string,
) {
  return archived
    ? run(
        ArchiveForumTopicDocument,
        { topicId },
        (d) => d.archiveForumTopic,
        revalidate,
      )
    : run(
        UnarchiveForumTopicDocument,
        { topicId },
        (d) => d.unarchiveForumTopic,
        revalidate,
      );
}

export async function setForumTopicTrashed(
  topicId: string,
  trashed: boolean,
  revalidate?: string,
) {
  return trashed
    ? run(
        TrashForumTopicDocument,
        { topicId },
        (d) => d.trashForumTopic,
        revalidate,
      )
    : run(
        RestoreForumTopicDocument,
        { topicId },
        (d) => d.restoreForumTopic,
        revalidate,
      );
}

export async function moveForumTopic(
  topicId: string,
  targetForumId: string,
  revalidate?: string,
) {
  return run(
    MoveForumTopicDocument,
    { topicId, targetForumId },
    (d) => d.moveForumTopic,
    revalidate,
  );
}

export async function mergeForumTopics(
  sourceTopicId: string,
  targetTopicId: string,
  revalidate?: string,
) {
  return run(
    MergeForumTopicsDocument,
    { sourceTopicId, targetTopicId },
    (d) => d.mergeForumTopics,
    revalidate,
  );
}

export async function splitForumTopic(
  sourceTopicId: string,
  numbers: number[],
  title: string,
  revalidate?: string,
) {
  return run(
    SplitForumTopicDocument,
    { sourceTopicId, numbers, title },
    (d) => d.splitForumTopic,
    revalidate,
  );
}

export async function moveForumPosts(
  sourceTopicId: string,
  targetTopicId: string,
  numbers: number[],
  revalidate?: string,
) {
  return run(
    MoveForumPostsDocument,
    { sourceTopicId, targetTopicId, numbers },
    (d) => d.moveForumPosts,
    revalidate,
  );
}

export async function moderateForumPost(
  postId: string,
  action: "HIDE" | "DELETE" | "RESTORE",
  reason: string,
  revalidate?: string,
) {
  if (action === "RESTORE") {
    return run(
      RestoreForumPostDocument,
      { postId },
      (d) => d.restoreForumPost,
      revalidate,
    );
  }
  return action === "HIDE"
    ? run(
        HideForumPostDocument,
        { postId, reason },
        (d) => d.hideForumPost,
        revalidate,
      )
    : run(
        DeleteForumPostDocument,
        { postId, reason },
        (d) => d.deleteForumPost,
        revalidate,
      );
}

/** Administrators only; the reason is mandatory and permanent. */
export async function purgeForumPost(
  postId: string,
  reason: string,
  revalidate?: string,
) {
  return run(
    PurgeForumPostDocument,
    { postId, reason },
    (d) => d.purgeForumPost,
    revalidate,
  );
}

export async function addForumStaffNote(
  postId: string,
  body: string,
  revalidate?: string,
  role?: ForumStaffRole | null,
) {
  return run(
    AddForumStaffNoteDocument,
    { postId, body, role: role ?? null },
    (d) => d.addForumStaffNote,
    revalidate,
  );
}

export async function removeForumStaffNote(
  noteId: string,
  revalidate?: string,
) {
  return run(
    RemoveForumStaffNoteDocument,
    { noteId },
    (d) => d.removeForumStaffNote,
    revalidate,
  );
}

export async function reverseForumPostVote(
  postId: string,
  voterId: string,
  reason: string,
  revalidate?: string,
) {
  return run(
    ReverseForumPostVoteDocument,
    { postId, voterId, reason },
    (d) => d.reverseForumPostVote,
    revalidate,
  );
}

/** A third active warning escalates to read-only automatically (API rule). */
export async function warnForumPostAuthor(postId: string, reason: string) {
  return run(
    WarnForumPostAuthorDocument,
    { postId, reason },
    (d) => d.warnForumPostAuthor,
  );
}

export async function restrictForumPostAuthor(
  postId: string,
  reason: string,
  until: Date,
) {
  return run(
    RestrictForumPostAuthorDocument,
    { postId, reason, until: until.toISOString() },
    (d) => d.restrictForumPostAuthor,
  );
}

// ── Reads used by client components ────────────────────────────

/** Who voted on a post (opened from the rating column). */
export async function getForumPostVoters(postId: string, page = 1) {
  return forumResult(async () => {
    const { loadForumPostVotes } = await import("./forum-data");
    return loadForumPostVotes(postId, page);
  });
}

/** Curated, active tags of a section for the topic form. */
export async function getForumSectionTags(forumId: string) {
  return forumResult(async () => {
    const { loadForumTags } = await import("./forum-data");
    return (await loadForumTags(forumId))
      .filter((tag) => tag.active)
      .map(({ id, slug, label }) => ({ id, slug, label }));
  });
}

// ── Member reputation (owner 2026-11-26) ───────────────────────

/** Changes the post author's reputation from that post, with a reason. */
export async function giveForumPostReputation(
  postId: string,
  recipientId: string,
  value: 1 | -1,
  reason: string,
  revalidate?: string,
) {
  return run(
    GiveForumPostReputationDocument,
    {
      input: {
        recipientId,
        value,
        reason: reason.trim(),
        source: { type: "FORUM_POST", id: postId },
      },
    },
    (d) => d.giveReputation,
    revalidate,
  );
}

/** Public reputation journal of a member (signed-in readers). */
export async function getReputationJournal(userId: string, page = 1) {
  return forumResult(async () => {
    const result = await getClient().query({
      query: ReputationJournalDocument,
      variables: { userId, page, limit: 20 },
      context: await signedIn(),
      fetchPolicy: "no-cache",
    });
    if (!result.data) throw new Error("Reputation journal is unavailable.");
    return result.data.reputationHistory;
  });
}

/** Cancels a reputation change; the API requires `reputation.reverse`. */
export async function reverseReputationEntry(
  entryId: string,
  reason: string,
  path: string,
) {
  return run(
    ReverseReputationEntryDocument,
    { input: { entryId, reason } },
    (data) => data.reverseReputation,
    path,
  );
}

/** Edit history of a post: who and when; texts for the author and staff. */
export async function getForumPostRevisions(postId: string) {
  return forumResult(async () => {
    const result = await getClient().query({
      query: ForumPostRevisionsDocument,
      variables: { postId },
      context: await optionalSession(),
      fetchPolicy: "no-cache",
    });
    if (!result.data) throw new Error("Post history is unavailable.");
    return result.data.forumPostRevisions;
  });
}
