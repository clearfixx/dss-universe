/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-data.ts
 *
 * 🎯 Purpose:
 * Server-side loaders for forum screens (categories, topic lists, threads,
 * votes, polls, viewer state).
 *
 * ⚠️ Important:
 * Every request carries the viewer's session when present: the API decides
 * visibility (hidden categories, gated blocks, staff fields). Not found and
 * not visible both resolve to null so pages can render a 404.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import {
  CommunitySearchDocument,
  ForumCategoriesDocument,
  ForumHubDocument,
  ForumSectionStateDocument,
  ForumWeeklyTopDocument,
  ForumPostRevisionsDocument,
  ForumPostVotesDocument,
  ForumTagsDocument,
  ForumTopicPollDocument,
  ForumTopicThreadDocument,
  ForumTopicViewerStateDocument,
  ForumTopicsDocument,
  ViewerForumSanctionStatusDocument,
  ViewerForumTopicsDocument,
  type ForumTopicFilter,
  type ForumTopicKind,
  type ForumReplySort,
  type ForumTopicScope,
  type ForumTopicSort,
  type ForumTopPeriod,
  type ForumViewerCollection,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

import { toForumError } from "./forum-errors";

export const FORUM_PAGE_SIZE = 20;

async function authContext() {
  const token = (await cookies()).get("dss_access_token")?.value;
  return token ? { headers: { authorization: `Bearer ${token}` } } : undefined;
}

async function hasSession() {
  return Boolean((await cookies()).get("dss_access_token")?.value);
}

async function orNull<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    if (toForumError(error).code === "NOT_FOUND") return null;
    throw error;
  }
}

export const loadForumCategories = cache(async () => {
  const result = await getClient().query({
    query: ForumCategoriesDocument,
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  return result.data?.forumCategories ?? [];
});

export type ForumTopicListQuery = Readonly<{
  forumId: string;
  sort?: ForumTopicSort;
  filter?: ForumTopicFilter;
  scope?: ForumTopicScope;
  topPeriod?: ForumTopPeriod;
  tagSlug?: string | null;
  kind?: ForumTopicKind | null;
  page?: number;
}>;

export async function loadForumTopics(input: ForumTopicListQuery) {
  return orNull(async () => {
    const result = await getClient().query({
      query: ForumTopicsDocument,
      variables: {
        forumId: input.forumId,
        sort: input.sort ?? "LAST_ACTIVITY",
        filter: input.filter ?? "ALL",
        scope: input.scope ?? "ACTIVE",
        topPeriod: input.topPeriod ?? "WEEK",
        tagSlug: input.tagSlug ?? null,
        kind: input.kind ?? null,
        page: input.page ?? 1,
        limit: FORUM_PAGE_SIZE,
      },
      context: await authContext(),
      fetchPolicy: "no-cache",
    });
    return result.data?.forumTopics ?? null;
  });
}

/** Signed-in only: own or followed topics across the forum. */
export async function loadViewerForumTopics(
  collection: ForumViewerCollection,
  page = 1,
) {
  if (!(await hasSession())) return null;
  const result = await getClient().query({
    query: ViewerForumTopicsDocument,
    variables: { collection, page, limit: FORUM_PAGE_SIZE },
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  return result.data?.viewerForumTopics ?? null;
}

/** Topic header and one page of posts; null when missing or not visible. */
export const loadForumThread = cache(
  async (topicId: string, page = 1, sort: ForumReplySort = "OLDEST") =>
    orNull(async () => {
      const result = await getClient().query({
        query: ForumTopicThreadDocument,
        variables: { topicId, page, limit: FORUM_PAGE_SIZE, sort },
        context: await authContext(),
        fetchPolicy: "no-cache",
      });
      return result.data
        ? {
            topic: result.data.forumTopic,
            posts: result.data.forumPosts,
            similar: result.data.forumSimilarTopics,
          }
        : null;
    }),
);

/** Subscription and sanction state of the signed-in viewer for a topic. */
export async function loadForumTopicViewerState(topicId: string) {
  if (!(await hasSession())) return null;
  const result = await getClient().query({
    query: ForumTopicViewerStateDocument,
    variables: { topicId },
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  return result.data
    ? {
        subscribed: result.data.forumTopicSubscribed,
        sanctions: result.data.viewerSanctionStatus,
      }
    : null;
}

export async function loadForumTopicPoll(interactionTargetId: string) {
  const result = await getClient().query({
    query: ForumTopicPollDocument,
    variables: { interactionTargetId },
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  return result.data?.pollForTarget ?? null;
}

export async function loadForumPostVotes(postId: string, page = 1) {
  return orNull(async () => {
    const result = await getClient().query({
      query: ForumPostVotesDocument,
      variables: { postId, page, limit: 50 },
      context: await authContext(),
      fetchPolicy: "no-cache",
    });
    return result.data?.forumPostVotes ?? null;
  });
}

export async function loadForumTags(forumId: string) {
  const result = await getClient().query({
    query: ForumTagsDocument,
    variables: { forumId },
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  return result.data?.forumTags ?? [];
}

export async function loadForumPostRevisions(postId: string) {
  return orNull(async () => {
    const result = await getClient().query({
      query: ForumPostRevisionsDocument,
      variables: { postId },
      context: await authContext(),
      fetchPolicy: "no-cache",
    });
    return result.data?.forumPostRevisions ?? null;
  });
}

/** Read-only state of the signed-in viewer (null for guests). */
export async function loadViewerSanctionStatus() {
  if (!(await hasSession())) return null;
  const result = await getClient().query({
    query: ViewerForumSanctionStatusDocument,
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  return result.data?.viewerSanctionStatus ?? null;
}

/** Hub home: totals, topics needing help, unanswered topics, popular tags. */
export async function loadForumHub() {
  const result = await getClient().query({
    query: ForumHubDocument,
    variables: { helpLimit: 4, latestLimit: 4, tagLimit: 9 },
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  if (!result.data) throw new Error("FORUM_HUB_UNAVAILABLE");
  return result.data;
}

/** Section counters (filters, header) and whether the viewer follows it. */
export async function loadForumSectionState(forumId: string) {
  return orNull(async () => {
    const result = await getClient().query({
      query: ForumSectionStateDocument,
      variables: { forumId },
      context: await authContext(),
      fetchPolicy: "no-cache",
    });
    return result.data ?? null;
  });
}

/** Signed-in only (the leaderboard is private to members). */
export async function loadForumWeeklyTop(limit = 5) {
  if (!(await hasSession())) return null;
  return orNull(async () => {
    const result = await getClient().query({
      query: ForumWeeklyTopDocument,
      variables: { limit },
      context: await authContext(),
      fetchPolicy: "no-cache",
    });
    return result.data?.leaderboard.items ?? null;
  });
}

export const COMMUNITY_SEARCH_PAGE_SIZE = 10;
/** Longest term the shared search API accepts. */
export const COMMUNITY_SEARCH_MAX_TERM = 100;

/** Forum topics and news for one term (P1 A11); the API applies visibility. */
export async function loadCommunitySearch(
  term: string,
  topicPage = 1,
  newsPage = 1,
) {
  const result = await getClient().query({
    query: CommunitySearchDocument,
    variables: {
      term,
      topicPage,
      newsPage,
      pageSize: COMMUNITY_SEARCH_PAGE_SIZE,
    },
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  if (!result.data) throw new Error("COMMUNITY_SEARCH_UNAVAILABLE");
  return result.data;
}
