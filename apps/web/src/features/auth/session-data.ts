import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { ViewerDocument } from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

import { ACCESS_COOKIE, type SessionViewer } from "./session-contract";

export const loadSessionViewer = cache(
  async (): Promise<SessionViewer | null> => {
    const token = (await cookies()).get(ACCESS_COOKIE)?.value;
    if (!token) return null;

    try {
      const result = await getClient().query({
        query: ViewerDocument,
        context: { headers: { authorization: `Bearer ${token}` } },
        fetchPolicy: "no-cache",
      });
      return result.data?.viewer ?? null;
    } catch {
      return null;
    }
  },
);
