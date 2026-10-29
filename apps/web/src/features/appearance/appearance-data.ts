import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { siteConfig } from "@/config/site.config";
import { ACCESS_COOKIE } from "@/features/auth/session-contract";
import {
  DEFAULT_SHELL_VARIANT,
  isShellVariant,
  type ShellVariant,
} from "@/components/shell/shell-navigation";

type AppearanceResponse = {
  data?: {
    platformAppearance?: { activeShellVariant?: unknown };
    adminPlatformAppearance?: { activeShellVariant?: unknown };
  };
  errors?: { message?: string }[];
};

const PUBLIC_QUERY = `query PlatformAppearance { platformAppearance { activeShellVariant } }`;
const ADMIN_QUERY = `query AdminPlatformAppearance { adminPlatformAppearance { activeShellVariant } }`;

/** Request-scoped memoization only: global config must not become stale across requests. */
export const loadShellVariant = cache(async (): Promise<ShellVariant> => {
  try {
    const response = await fetch(siteConfig.graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: PUBLIC_QUERY }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return DEFAULT_SHELL_VARIANT;
    const result = (await response.json()) as AppearanceResponse;
    const value = result.data?.platformAppearance?.activeShellVariant;
    return isShellVariant(value) ? value : DEFAULT_SHELL_VARIANT;
  } catch {
    return DEFAULT_SHELL_VARIANT;
  }
});

export async function loadAdminShellVariant(): Promise<ShellVariant | null> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const response = await fetch(siteConfig.graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: ADMIN_QUERY }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const result = (await response.json()) as AppearanceResponse;
    if (result.errors?.length) return null;
    const value = result.data?.adminPlatformAppearance?.activeShellVariant;
    return isShellVariant(value) ? value : null;
  } catch {
    return null;
  }
}
