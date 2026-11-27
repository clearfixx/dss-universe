"use client";

import { useState, type ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DesignScope } from "@/components/ui/design-scope";
import { Separator } from "@/components/ui/separator";

import { FoundationSamples } from "./foundation-samples";
import { ControlSamples } from "./control-samples";
import { DataSamples, FeedbackSamples } from "./data-samples";
import { NavigationSamples, OverlaySamples } from "./interaction-samples";

const sections = [
  ["foundations", "Foundations"],
  ["controls", "Controls"],
  ["data", "Data display"],
  ["overlays", "Overlays"],
  ["navigation", "Navigation"],
  ["feedback", "Feedback"],
  ["patterns", "Patterns"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`kit-${id}-title`} className="scroll-mt-24 space-y-4">
      <h2 id={`kit-${id}-title`} className="font-heading text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function DesignUiKit() {
  const [revision, setRevision] = useState(0);

  return (
    <DesignScope>
      <div className="mx-auto max-w-[1500px] space-y-8 p-4 sm:p-6">
        <header className="space-y-2">
          <p className="text-xs font-medium text-link">DSS Universe / Design Foundation v1</p>
          <h1 className="font-heading text-[length:var(--dss-text-h1)] font-semibold leading-tight">DSS UI Kit</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">Internal component reference. All values are examples; interactions stay in this preview and never write platform data.</p>
          <button type="button" onClick={() => setRevision((value) => value + 1)} className="text-sm text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">Reset preview</button>
        </header>
        <nav aria-label="UI Kit sections" className="flex flex-wrap gap-x-4 gap-y-2 border-b border-border pb-4 text-sm">
          {sections.map(([id, label]) => <a key={id} href={`#${id}`} className="text-link hover:underline focus-visible:outline-2 focus-visible:outline-ring">{label}</a>)}
        </nav>
        <div key={revision} className="space-y-10">
          <Section id="foundations" title="Foundations"><FoundationSamples /></Section>
          <Section id="controls" title="Controls"><ControlSamples /></Section>
          <Section id="data" title="Data display"><DataSamples /></Section>
          <Section id="overlays" title="Overlays"><OverlaySamples /></Section>
          <Section id="navigation" title="Navigation"><NavigationSamples /></Section>
          <Section id="feedback" title="Feedback"><FeedbackSamples /></Section>
          <Section id="patterns" title="Patterns">
            <Card>
              <CardHeader><CardTitle>Composition pattern</CardTitle><CardDescription>Combine semantic surfaces, real controls and explicit feedback. Keep module permissions and data ownership outside the UI primitive.</CardDescription></CardHeader>
              <CardContent><Separator /><p className="mt-4 text-sm text-muted-foreground">Use the examples above as implementation references, not as templates for domain logic.</p></CardContent>
            </Card>
          </Section>
        </div>
      </div>
    </DesignScope>
  );
}
