/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web GraphQL
 * 📄 File: apps/web/src/lib/apollo/rsc-client.ts
 *
 * 🎯 Purpose:
 * Provides request-safe Apollo access for React Server Components.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";

import { siteConfig } from "@/config/site.config";

import { createApolloCache } from "./cache";

export const { getClient, query, PreloadQuery } = registerApolloClient(
  () =>
    new ApolloClient({
      cache: createApolloCache(),
      link: new HttpLink({
        uri: siteConfig.graphqlUrl,
        fetchOptions: { cache: "no-store" },
      }),
    }),
);
