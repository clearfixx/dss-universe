import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle, EmptyState, EmptyStateDescription, EmptyStateTitle, LoadingState, Skeleton } from "@/components/ui/feedback";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const variants = ["default", "secondary", "outline", "ghost", "link", "success", "warning", "info", "destructive"] as const;
const tones = ["default", "success", "warning", "info", "destructive"] as const;

export function DataSamples() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Badges and avatars</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">{variants.map((variant) => <Badge key={variant} variant={variant}>{variant}</Badge>)}</div>
          <Separator />
          <AvatarGroup><Avatar size="sm"><AvatarFallback>DS</AvatarFallback></Avatar><Avatar><AvatarFallback>UI</AvatarFallback></Avatar><Avatar size="lg"><AvatarFallback>UX</AvatarFallback></Avatar><AvatarGroupCount>+2</AvatarGroupCount></AvatarGroup>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">Card footer surface</CardFooter>
      </Card>
      <Card>
        <CardHeader><CardTitle>Table</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Illustrative service states — not live telemetry.</TableCaption>
            <TableHeader><TableRow><TableHead>Service</TableHead><TableHead>State</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow><TableCell>Example API</TableCell><TableCell><Badge variant="success">Ready</Badge></TableCell></TableRow>
              <TableRow data-state="selected"><TableCell>Example storage</TableCell><TableCell><Badge variant="warning">Pending</Badge></TableCell></TableRow>
              <TableRow><TableCell>Example worker</TableCell><TableCell><Badge variant="destructive">Error</Badge></TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function FeedbackSamples() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Alerts</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {tones.map((tone) => <Alert key={tone} variant={tone}><AlertTitle>{tone}</AlertTitle><AlertDescription>Static example of a {tone} message.</AlertDescription></Alert>)}
        </CardContent>
      </Card>
      <div className="space-y-4">
        <EmptyState><EmptyStateTitle>No demo records</EmptyStateTitle><EmptyStateDescription>This is the empty-state preview.</EmptyStateDescription></EmptyState>
        <Card>
          <CardHeader><CardTitle>Loading example</CardTitle></CardHeader>
          <CardContent><LoadingState aria-label="Example loading state">{[1, 2, 3].map((row) => <div key={row} className="flex items-center gap-3"><Skeleton className="size-9 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-2 w-1/2" /></div></div>)}</LoadingState></CardContent>
        </Card>
      </div>
    </div>
  );
}
