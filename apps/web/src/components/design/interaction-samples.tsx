"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Breadcrumbs } from "@/components/shell/shell-breadcrumbs";
import { NewsPagination } from "@/features/news/news-pagination";

export function OverlaySamples() {
  const [checked, setChecked] = useState(false);
  const [selection, setSelection] = useState("None");

  return (
    <Card>
      <CardHeader><CardTitle>Portal previews</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild><Button type="button">Open dialog</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Demo dialog</DialogTitle><DialogDescription>Check focus, backdrop and the shared surface. No changes are persisted.</DialogDescription></DialogHeader>
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Close preview</Button></DialogClose></DialogFooter>
            </DialogContent>
          </Dialog>
          <Sheet>
            <SheetTrigger asChild><Button type="button" variant="outline">Open sheet</Button></SheetTrigger>
            <SheetContent>
              <SheetHeader><SheetTitle>Demo sheet</SheetTitle><SheetDescription>Context follows this portal.</SheetDescription></SheetHeader>
              <SheetFooter><SheetClose asChild><Button type="button" variant="outline">Close sheet preview</Button></SheetClose></SheetFooter>
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button type="button" variant="outline">Open menu</Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Demo actions</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setSelection("Example selected")}>Select example</DropdownMenuItem>
              <DropdownMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>Checked option</DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Disabled action</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p role="status" className="text-xs text-muted-foreground">Menu result: {selection}; checked: {checked ? "yes" : "no"}</p>
      </CardContent>
    </Card>
  );
}

export function NavigationSamples() {
  const [pages, setPages] = useState([1]);
  const current = pages.at(-1) ?? 1;

  return (
    <Card>
      <CardHeader><CardTitle>Breadcrumbs and pagination</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Breadcrumbs pathname="/command-deck/design/ui-kit" trail={[{ href: "/command-deck", label: "Command Deck" }, { href: "/command-deck/design/ui-kit", label: "DSS UI Kit" }]} />
        <NewsPagination mode="BOTH" totalPages={15} activePages={pages} canLoadMore={current < 15} onPageChange={(page) => setPages([page])} onLoadMore={() => setPages((previous) => [...previous, Math.min((previous.at(-1) ?? 1) + 1, 15)])} />
        <p role="status" className="text-xs text-muted-foreground">Demo pages: {pages.join(", ")}</p>
      </CardContent>
    </Card>
  );
}
