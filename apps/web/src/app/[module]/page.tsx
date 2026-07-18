import { notFound } from "next/navigation";

import { DssApplicationShell } from "@/components/shell/dss-application-shell";
import { EmptyState } from "@/components/states/async-states";

const moduleNames: Record<string, string> = {
  members: "Community Members",
  research: "Research Lab",
  community: "Community Hub",
  knowledge: "Knowledge Nexus",
  academy: "Academy",
  media: "DSS Media Platform",
  ai: "AI Core",
};

type ModulePageProps = {
  params: Promise<{ module: string }>;
};

export default async function ModulePage({ params }: ModulePageProps) {
  const { module } = await params;
  const title = moduleNames[module];

  if (!title) {
    notFound();
  }

  return (
    <DssApplicationShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-violet-300">
            DSS Universe module
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
        </div>
        <EmptyState
          title={`${title} is ready for its vertical slice`}
          description="The shared shell, navigation and data foundations are active. Feature delivery continues in the next roadmap phase."
        />
      </div>
    </DssApplicationShell>
  );
}
