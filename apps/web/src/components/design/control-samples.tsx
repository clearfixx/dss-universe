"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Label, NativeSelect, Radio, Switch } from "@/components/ui/choice-fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const variants = ["default", "secondary", "outline", "ghost", "destructive", "link"] as const;
const sizes = ["xs", "sm", "default", "lg"] as const;

export function ControlSamples() {
  const [clicks, setClicks] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Buttons</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">{variants.map((variant) => <Button key={variant} type="button" variant={variant} onClick={() => setClicks((count) => count + 1)}>{variant}</Button>)}</div>
          <div className="flex flex-wrap items-center gap-2">{sizes.map((size) => <Button key={size} type="button" size={size} variant="outline" onClick={() => setClicks((count) => count + 1)}>{size}</Button>)}<Button type="button" size="icon" aria-label="Add demo item" onClick={() => setClicks((count) => count + 1)}><Plus aria-hidden="true" /></Button><Button disabled>Disabled</Button></div>
          <p role="status" className="text-xs text-muted-foreground">Local button clicks: {clicks}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Form controls</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
            <div className="space-y-1"><Label htmlFor="kit-name">Name</Label><Input id="kit-name" name="name" placeholder="Demo name" required /></div>
            <div className="space-y-1"><Label htmlFor="kit-invalid">Invalid field</Label><Input id="kit-invalid" aria-invalid="true" aria-describedby="kit-invalid-help" defaultValue="Invalid value" /><p id="kit-invalid-help" className="text-xs text-destructive">Example validation error.</p></div>
            <div className="space-y-1"><Label htmlFor="kit-disabled">Disabled field</Label><Input id="kit-disabled" disabled defaultValue="Unavailable" /></div>
            <div className="space-y-1"><Label htmlFor="kit-description">Description</Label><Textarea id="kit-description" name="description" placeholder="Sample description" /></div>
            <div className="space-y-1"><Label htmlFor="kit-sort">Sort</Label><NativeSelect id="kit-sort" name="sort" className="w-full"><option value="new">Newest</option><option value="old">Oldest</option></NativeSelect></div>
            <Label className="flex items-center gap-2"><Checkbox name="notify" defaultChecked /> Notifications</Label>
            <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Visibility</legend><Label className="flex items-center gap-2"><Radio name="visibility" value="public" defaultChecked /> Public</Label><Label className="flex items-center gap-2"><Radio name="visibility" value="private" /> Private</Label></fieldset>
            <Label className="flex items-center gap-2"><Switch name="digest" /> Digest</Label>
            <Button type="submit">Submit preview</Button>
            {submitted && <p role="status" className="text-sm text-success">Local preview submitted. No data saved.</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
