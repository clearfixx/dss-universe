import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const palette = [
  ["Background", "--background"], ["Shell", "--shell-surface"], ["Card", "--card"],
  ["Foreground", "--foreground"], ["Primary", "--primary"], ["Secondary", "--secondary"],
  ["Muted", "--muted"], ["Muted foreground", "--muted-foreground"], ["Accent", "--accent"],
  ["Border", "--border"], ["Input", "--input"], ["Ring", "--ring"],
  ["Cyan", "--brand-cyan"], ["Success", "--success"], ["Warning", "--warning"], ["Destructive", "--destructive"],
] as const;

const typography = [
  ["Display", "--dss-text-display"], ["H1", "--dss-text-h1"], ["H2", "--dss-text-h2"],
  ["H3", "--dss-text-h3"], ["H4", "--dss-text-h4"], ["Body large", "--dss-text-body-lg"],
  ["Body", "--dss-text-body"], ["Body small", "--dss-text-body-sm"], ["Caption", "--dss-text-caption"],
] as const;

export function FoundationSamples() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Semantic colors</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {palette.map(([label, token]) => <div key={token} className="min-w-0 space-y-1"><div aria-hidden="true" className="h-10 rounded-lg border border-border" style={{ backgroundColor: `var(${token})` }} /><p className="text-xs font-medium">{label}</p><code className="break-all text-xs text-muted-foreground">{token}</code></div>)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Typography · Inter / Inter Tight</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {typography.map(([label, token], index) => <div key={token} className="border-b border-border pb-2 last:border-0"><p className="text-xs text-muted-foreground">{label}</p><p className={index < 5 ? "font-heading leading-tight" : "font-sans leading-snug"} style={{ fontSize: `var(${token})` }}>Build. Розвивайся.</p></div>)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Radius</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {["2px", "4px", "8px", "12px", "9999px"].map((radius) => <div key={radius} className="space-y-1"><div className="size-12 border border-border bg-secondary" style={{ borderRadius: radius }} /><p className="text-xs text-muted-foreground">{radius === "9999px" ? "Full" : radius}</p></div>)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Spacing · 4 px grid</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96].map((space) => <div key={space} className="flex items-center gap-3"><span className="w-10 text-xs tabular-nums text-muted-foreground">{space} px</span><div aria-hidden="true" className="h-2 bg-secondary" style={{ width: space }} /></div>)}
        </CardContent>
      </Card>
    </div>
  );
}
