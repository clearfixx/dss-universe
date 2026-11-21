import { CommandDeckOverview } from "@/components/shell/command-deck-overview";
import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { GuestLanding } from "@/components/shell/guest-landing";
import { loadViewerActivityFeed } from "@/features/activity/activity-data";
import { loadSessionViewer } from "@/features/auth/session-data";

export default async function HomePage() {
  // A cookie can be expired or revoked. Only a server-validated viewer
  // may enter the personalized dashboard.
  const viewer = await loadSessionViewer();

  if (!viewer) {
    return <GuestLanding />;
  }

  const feed = await loadViewerActivityFeed();

  return (
    <DssApplicationShell>
      <CommandDeckOverview feed={feed} />
    </DssApplicationShell>
  );
}
