import { notFound } from "next/navigation";

import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";
import { CommandDeckOverview } from "@/components/shell/command-deck-overview";
import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { loadViewerActivityFeed } from "@/features/activity/activity-data";

export default async function CommandDeckPage() {
  if (!(await loadAdminCommandDeckAccess())) notFound();
  const feed = await loadViewerActivityFeed();
  return (
    <DssApplicationShell>
      <CommandDeckOverview feed={feed} />
    </DssApplicationShell>
  );
}
