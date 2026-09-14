"use server";

import { cookies } from "next/headers";

import { MarkActivityFeedVisitedDocument } from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

export async function markActivityFeedVisited() {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) return;
  await getClient().mutate({
    mutation: MarkActivityFeedVisitedDocument,
    context: { headers: { authorization: `Bearer ${token}` } },
  });
}
