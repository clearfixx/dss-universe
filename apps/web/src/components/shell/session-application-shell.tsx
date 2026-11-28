import type { PropsWithChildren, ReactNode } from "react";

import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";
import { loadSessionViewer } from "@/features/auth/session-data";
import { loadForumModerationOverview } from "@/features/forum/forum-data";
import { loadShellVariant } from "@/features/appearance/appearance-data";

import {
  DssApplicationShell as DssApplicationShellClient,
  type TrustedBreadcrumb,
} from "./dss-application-shell";
import type { TrustedPageTitle } from "./shell-navigation";

type ShellProps = PropsWithChildren<{
  toolbar?: ReactNode;
  pageTitle?: TrustedPageTitle;
  /** Route-owned trail for pages deeper than the shell registry knows. */
  breadcrumbs?: readonly TrustedBreadcrumb[];
}>;

/**
 * The session and public appearance configuration are independent.
 * Administrative IAM is evaluated only after the API confirms a viewer.
 * Presentation flags are never substitutes for route/API authorization.
 */
export async function DssApplicationShell({
  children,
  toolbar,
  pageTitle,
  breadcrumbs,
}: ShellProps) {
  const [viewer, variant] = await Promise.all([
    loadSessionViewer(),
    loadShellVariant(),
  ]);
  const [canAccessAdminDeck, canModerate] = viewer
    ? await Promise.all([
        loadAdminCommandDeckAccess(),
        loadForumModerationOverview().then((overview) => Boolean(overview && overview !== "DENIED")).catch(() => false),
      ])
    : [false, false];

  return (
    <DssApplicationShellClient
      viewer={viewer}
      variant={variant}
      canAccessAdminDeck={canAccessAdminDeck}
      canModerate={canModerate}
      toolbar={toolbar}
      pageTitle={pageTitle}
      breadcrumbs={breadcrumbs}
    >
      {children}
    </DssApplicationShellClient>
  );
}
