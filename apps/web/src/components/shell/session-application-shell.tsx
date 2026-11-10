import type { PropsWithChildren, ReactNode } from "react";

import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";
import { loadSessionViewer } from "@/features/auth/session-data";
import { loadShellVariant } from "@/features/appearance/appearance-data";

import { DssApplicationShell as DssApplicationShellClient } from "./dss-application-shell";
import type { TrustedPageTitle } from "./shell-navigation";

type ShellProps = PropsWithChildren<{
  toolbar?: ReactNode;
  pageTitle?: TrustedPageTitle;
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
}: ShellProps) {
  const [viewer, variant] = await Promise.all([
    loadSessionViewer(),
    loadShellVariant(),
  ]);
  const canAccessAdminDeck = viewer
    ? await loadAdminCommandDeckAccess()
    : false;

  return (
    <DssApplicationShellClient
      viewer={viewer}
      variant={variant}
      canAccessAdminDeck={canAccessAdminDeck}
      toolbar={toolbar}
      pageTitle={pageTitle}
    >
      {children}
    </DssApplicationShellClient>
  );
}
