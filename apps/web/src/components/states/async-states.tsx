/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web UI States
 * 📄 File: apps/web/src/components/states/async-states.tsx
 *
 * 🎯 Purpose:
 * Provides consistent loading, empty and error states for future modules.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";

type StateProps = {
  title: string;
  description?: string;
};

function StateFrame({
  title,
  description,
  icon: Icon,
}: StateProps & { icon: typeof Inbox }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
      <div>
        <Icon className="mx-auto mb-4 size-8 text-violet-300" />
        <h2 className="font-semibold">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm text-slate-400">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function LoadingState({
  title = "Loading mission data",
}: Partial<StateProps>) {
  return <StateFrame title={title} icon={LoaderCircle} />;
}

export function EmptyState(props: StateProps) {
  return <StateFrame {...props} icon={Inbox} />;
}

export function ErrorState(props: StateProps) {
  return <StateFrame {...props} icon={AlertCircle} />;
}
