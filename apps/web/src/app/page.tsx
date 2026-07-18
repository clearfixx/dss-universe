import { cookies } from "next/headers";

import { CommandDeckOverview } from "@/components/shell/command-deck-overview";
import { DssApplicationShell } from "@/components/shell/dss-application-shell";
import { GuestLanding } from "@/components/shell/guest-landing";

export default async function HomePage() {
  const session = (await cookies()).get("dss_access_token");

  if (!session) {
    return <GuestLanding />;
  }

  return (
    <DssApplicationShell>
      <CommandDeckOverview />
    </DssApplicationShell>
  );
}
