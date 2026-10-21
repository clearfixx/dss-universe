import "server-only";

import { cookies } from "next/headers";

import { ViewerActivityFeedDocument } from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

export async function loadViewerActivityFeed() {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) return null;
  const context = { headers: { authorization: `Bearer ${token}` } };

  try {
    const result = await getClient().query({
      query: ViewerActivityFeedDocument,
      variables: { input: { page: 1, limit: 8 } },
      context,
      fetchPolicy: "no-cache",
    });
    if (!result.data?.viewerActivityFeed) return null;
    return result.data.viewerActivityFeed;
  } catch {
    return null;
  }
}
