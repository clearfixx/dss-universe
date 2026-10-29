import type { PropsWithChildren, ReactNode } from "react";

import { loadSessionViewer } from "@/features/auth/session-data";

import { DssApplicationShell as DssApplicationShellClient } from "./dss-application-shell";

export async function DssApplicationShell({ children, toolbar }: PropsWithChildren<{ toolbar?: ReactNode }>) {
  const viewer = await loadSessionViewer();
  return (
    <DssApplicationShellClient viewer={viewer} toolbar={toolbar}>
      {children}
    </DssApplicationShellClient>
  );
}
