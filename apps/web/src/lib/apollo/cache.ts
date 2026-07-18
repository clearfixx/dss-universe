/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web GraphQL
 * 📄 File: apps/web/src/lib/apollo/cache.ts
 *
 * 🎯 Purpose:
 * Defines normalized Apollo cache ownership and pagination policies.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { InMemoryCache } from "@apollo/client-integration-nextjs";

export function createApolloCache() {
  return new InMemoryCache({
    typePolicies: {
      User: {
        keyFields: ["id"],
      },
      Viewer: {
        keyFields: ["id"],
      },
      Query: {
        fields: {
          users: {
            keyArgs: ["pagination", ["limit"]],
          },
        },
      },
    },
  });
}
