import { cookies } from "next/headers";

import { CommandDeckOverview } from "@/components/shell/command-deck-overview";
import { DssApplicationShell } from "@/components/shell/dss-application-shell";
import { GuestLanding } from "@/components/shell/guest-landing";
import { loadViewerActivityFeed } from "@/features/activity/activity-data";

export default async function HomePage() {
  const session = (await cookies()).get("dss_access_token");

  if (!session) {
    return <GuestLanding />;
  }

  const feed = await loadViewerActivityFeed();

  return (
    <DssApplicationShell>
      <CommandDeckOverview feed={feed} />
    </DssApplicationShell>
  );
}
