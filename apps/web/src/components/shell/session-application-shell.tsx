import type { PropsWithChildren } from "react";

import { loadSessionViewer } from "@/features/auth/session-data";

import { DssApplicationShell as DssApplicationShellClient } from "./dss-application-shell";

export async function DssApplicationShell({ children }: PropsWithChildren) {
  const viewer = await loadSessionViewer();
  return (
    <DssApplicationShellClient viewer={viewer}>
      {children}
    </DssApplicationShellClient>
  );
}
