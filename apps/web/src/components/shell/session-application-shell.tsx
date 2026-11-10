import type { PropsWithChildren, ReactNode } from "react";

import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";
import { loadSessionViewer } from "@/features/auth/session-data";
import { loadShellVariant } from "@/features/appearance/appearance-data";

import { DssApplicationShell as DssApplicationShellClient } from "./dss-application-shell";
import type { TrustedPageTitle } from "./shell-navigation";

export async function DssApplicationShell({ children, toolbar, pageTitle }: PropsWithChildren<{ toolbar?: ReactNode; pageTitle?: TrustedPageTitle }>) {
  const [viewer, variant, canAccessAdminDeck] = await Promise.all([
    loadSessionViewer(),
    loadShellVariant(),
    loadAdminCommandDeckAccess(),
  ]);
  return (
    <DssApplicationShellClient viewer={viewer} variant={variant} canAccessAdminDeck={canAccessAdminDeck} toolbar={toolbar} pageTitle={pageTitle}>
      {children}
    </DssApplicationShellClient>
  );
}
