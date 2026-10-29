import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { siteConfig } from "@/config/site.config";
import { ACCESS_COOKIE } from "@/features/auth/session-contract";

const QUERY = "query AdminCommandDeckAccess { adminCommandDeckAccess }";

/** Server-only, request-scoped IAM check; fail closed on all errors. */
export const loadAdminCommandDeckAccess = cache(async (): Promise<boolean> => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return false;

  try {
    const response = await fetch(siteConfig.graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: QUERY }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as {
      data?: { adminCommandDeckAccess?: unknown };
      errors?: unknown[];
    };
    return !payload.errors?.length && payload.data?.adminCommandDeckAccess === true;
  } catch {
    return false;
  }
});
