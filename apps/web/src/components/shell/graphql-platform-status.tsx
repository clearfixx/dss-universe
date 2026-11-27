/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Application Shell
 * 📄 File: apps/web/src/components/shell/graphql-platform-status.tsx
 *
 * 🎯 Purpose:
 * Demonstrates the generated Apollo operation boundary in the application shell.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use client";

import { useQuery } from "@apollo/client/react";

import { ApiInfoDocument } from "@/gql/graphql";

export function GraphqlPlatformStatus() {
  const { data, loading } = useQuery(ApiInfoDocument, {
    errorPolicy: "all",
  });

  if (loading) {
    return <span role="status" className="text-muted-foreground">Connecting to DSS API…</span>;
  }

  if (!data) {
    return <span role="status" className="text-warning">DSS API is unavailable</span>;
  }

  return (
    <span role="status" className="text-success">
      {data.apiInfo.name} · {data.apiInfo.transport} · {data.apiInfo.status}
    </span>
  );
}
