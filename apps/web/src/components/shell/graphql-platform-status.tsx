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
    return <span className="text-slate-500">Connecting to DSS API…</span>;
  }

  if (!data) {
    return <span className="text-amber-300">DSS API is unavailable</span>;
  }

  return (
    <span className="text-emerald-300">
      {data.apiInfo.name} · {data.apiInfo.transport} · {data.apiInfo.status}
    </span>
  );
}
