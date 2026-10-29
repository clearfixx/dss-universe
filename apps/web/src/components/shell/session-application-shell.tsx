import type { PropsWithChildren, ReactNode } from "react";

import { loadSessionViewer } from "@/features/auth/session-data";
import { loadShellVariant } from "@/features/appearance/appearance-data";

import { DssApplicationShell as DssApplicationShellClient } from "./dss-application-shell";

export async function DssApplicationShell({ children, toolbar }: PropsWithChildren<{ toolbar?: ReactNode }>) {
  const [viewer, variant] = await Promise.all([loadSessionViewer(), loadShellVariant()]);
  return (
    <DssApplicationShellClient viewer={viewer} variant={variant} toolbar={toolbar}>
      {children}
    </DssApplicationShellClient>
  );
}
