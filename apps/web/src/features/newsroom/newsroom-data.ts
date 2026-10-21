import "server-only";

import { cookies } from "next/headers";

import {
  EditorialNewsDocument,
  NewsEditorialArticleDocument,
  type NewsArticleStatus,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

async function authContext() {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new Error("AUTH_REQUIRED");
  return { headers: { authorization: `Bearer ${token}` } };
}

export async function loadEditorialNews(statuses?: NewsArticleStatus[]) {
  const result = await getClient().query({
    query: EditorialNewsDocument,
    variables: { input: { page: 1, pageSize: 50, statuses } },
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  return result.data?.editorialNews ?? null;
}

export async function loadEditorialArticle(articleId: string) {
  const result = await getClient().query({
    query: NewsEditorialArticleDocument,
    variables: { articleId },
    context: await authContext(),
    fetchPolicy: "no-cache",
  });
  return result.data?.newsEditorialArticle ?? null;
}
