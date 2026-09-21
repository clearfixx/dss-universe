"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  ClearNewsVoteDocument,
  RemoveNewsBookmarkDocument,
  SaveNewsBookmarkDocument,
  SetNewsVoteDocument,
  type NewsVoteKind,
  type NewsBrowseInput,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

import { loadNewsCatalog, loadRatingVotes } from "./news-data";

async function context() {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new Error("Увійдіть, щоб оцінювати та зберігати новини.");
  return { headers: { authorization: `Bearer ${token}` } };
}

export async function loadMoreNews(input: NewsBrowseInput) {
  return (await loadNewsCatalog(input)).news;
}

export async function getNewsRatingVotes(articleId: string, page = 1) {
  return loadRatingVotes(articleId, page, 20);
}

export async function setNewsVote(
  interactionTargetId: string,
  kind: NewsVoteKind,
  articlePath: string,
) {
  const result = await getClient().mutate({
    mutation: SetNewsVoteDocument,
    variables: { input: { interactionTargetId, kind } },
    context: await context(),
  });
  revalidatePath(articlePath);
  return result.data?.setReaction.summary;
}

export async function clearNewsVote(
  interactionTargetId: string,
  articlePath: string,
) {
  const result = await getClient().mutate({
    mutation: ClearNewsVoteDocument,
    variables: { interactionTargetId },
    context: await context(),
  });
  revalidatePath(articlePath);
  return result.data?.clearReaction;
}

export async function setNewsBookmark(
  interactionTargetId: string,
  saved: boolean,
  articlePath: string,
) {
  const auth = await context();
  const nextSaved = saved
    ? (
        await getClient().mutate({
          mutation: RemoveNewsBookmarkDocument,
          variables: { interactionTargetId },
          context: auth,
        })
      ).data?.removeBookmark.saved
    : (
        await getClient().mutate({
          mutation: SaveNewsBookmarkDocument,
          variables: { interactionTargetId },
          context: auth,
        })
      ).data?.saveBookmark.saved;
  revalidatePath(articlePath);
  return nextSaved;
}
