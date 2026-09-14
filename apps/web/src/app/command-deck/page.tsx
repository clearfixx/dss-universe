import { CommandDeckOverview } from "@/components/shell/command-deck-overview";
import { DssApplicationShell } from "@/components/shell/dss-application-shell";
import { loadViewerActivityFeed } from "@/features/activity/activity-data";

export default async function CommandDeckPage() {
  const feed = await loadViewerActivityFeed();
  return (
    <DssApplicationShell>
      <CommandDeckOverview feed={feed} />
    </DssApplicationShell>
  );
}
