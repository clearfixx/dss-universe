/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Static Pages
 * 📄 File: apps/web/src/features/static-pages/static-page-data.ts
 *
 * 🎯 Purpose:
 * Public server reads of published static pages (no session).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { cache } from "react";

import {
  PublishedStaticPageDocument,
  PublishedStaticPagesDocument,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

export const loadPublishedStaticPage = cache(async (slug: string) => {
  const result = await getClient().query({
    query: PublishedStaticPageDocument,
    variables: { slug },
    fetchPolicy: "no-cache",
  });
  return result.data?.staticPage ?? null;
});

export async function loadPublishedStaticPageIndex() {
  const result = await getClient().query({
    query: PublishedStaticPagesDocument,
    fetchPolicy: "no-cache",
  });
  return result.data?.publishedStaticPages ?? [];
}
