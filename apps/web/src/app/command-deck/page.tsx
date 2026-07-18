import { CommandDeckOverview } from "@/components/shell/command-deck-overview";
import { DssApplicationShell } from "@/components/shell/dss-application-shell";

export default function CommandDeckPage() {
  return (
    <DssApplicationShell>
      <CommandDeckOverview />
    </DssApplicationShell>
  );
}
