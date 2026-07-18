/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Application
 * 📄 File: apps/web/src/components/providers/app-providers.tsx
 *
 * 🎯 Purpose:
 * Composes client-side providers with explicit server-state ownership.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use client";

import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
} from "@apollo/client-integration-nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type PropsWithChildren } from "react";

import { siteConfig } from "@/config/site.config";
import { createApolloCache } from "@/lib/apollo/cache";

function makeApolloClient() {
  return new ApolloClient({
    cache: createApolloCache(),
    link: new HttpLink({
      uri: siteConfig.graphqlUrl,
      credentials: "include",
    }),
  });
}

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ApolloNextAppProvider makeClient={makeApolloClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ApolloNextAppProvider>
  );
}
