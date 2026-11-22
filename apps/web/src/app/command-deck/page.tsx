import { notFound } from "next/navigation";

import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";
import { CommandDeckOverview } from "@/components/shell/command-deck-overview";
import { CommandDeckFrame } from "@/components/command-deck/command-deck-frame";
import { loadViewerActivityFeed } from "@/features/activity/activity-data";

export default async function CommandDeckPage() {
  if (!(await loadAdminCommandDeckAccess())) notFound();
  const feed = await loadViewerActivityFeed();
  return (
    <CommandDeckFrame breadcrumbs={[{ label: "Station Overview" }]}>
      <CommandDeckOverview feed={feed} />
    </CommandDeckFrame>
  );
}
