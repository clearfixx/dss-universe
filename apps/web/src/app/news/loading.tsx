import { DssApplicationShell } from "@/components/shell/dss-application-shell";

export default function NewsLoading() {
  return (
    <DssApplicationShell>
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-64 rounded-3xl bg-white/5" />
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-96 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    </DssApplicationShell>
  );
}
