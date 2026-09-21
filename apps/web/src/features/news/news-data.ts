import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import {
  FullNewsPageDocument,
  NewsCatalogDocument,
  NewsNavigationDocument,
  NewsRatingVotesDocument,
  type NewsBrowseInput,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

async function authContext() {
  const token = (await cookies()).get("dss_access_token")?.value;
  return token ? { headers: { authorization: `Bearer ${token}` } } : undefined;
}

export async function loadNewsCatalog(input: NewsBrowseInput) {
  const result = await getClient().query({
    query: NewsCatalogDocument,
    variables: { input },
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  if (!result.data) throw new Error("NEWS_CATALOG_UNAVAILABLE");
  return result.data;
}

export const loadFullNews = cache(async (language: string, slug: string) => {
  const result = await getClient().query({
    query: FullNewsPageDocument,
    variables: { language, slug },
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  return result.data?.fullNews ?? null;
});

export async function loadNewsNavigation(articleId: string) {
  const result = await getClient().query({
    query: NewsNavigationDocument,
    variables: { articleId },
    fetchPolicy: "no-cache",
  });
  return result.data?.newsNavigation ?? { previous: null, next: null };
}

export async function loadRatingVotes(
  articleId: string,
  page = 1,
  pageSize = 20,
) {
  const result = await getClient().query({
    query: NewsRatingVotesDocument,
    variables: { articleId, page, pageSize },
    fetchPolicy: "no-cache",
  });
  if (!result.data) throw new Error("NEWS_RATING_UNAVAILABLE");
  return result.data.newsRatingVotes;
}
