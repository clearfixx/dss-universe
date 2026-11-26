"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export function ShellSearch() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const mobileInput = useRef<HTMLInputElement>(null);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (mobileInput.current?.getClientRects().length) mobileInput.current.focus();
        else if (input.current?.getClientRects().length) input.current.focus();
        else setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  function submit() {
    const value = term.trim();
    if (!value) return;
    setOpen(false);
    router.push(`/community/search?q=${encodeURIComponent(value)}`);
  }
  return (
    <>
      <Button ref={mobileTrigger} type="button" variant="ghost" size="icon" className="shrink-0 sm:hidden" aria-label="Відкрити пошук" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <Search aria-hidden="true" />
      </Button>
      <form role="search" className="hidden min-w-0 sm:block" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <label className="flex h-10 w-40 items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 text-sm text-muted-foreground focus-within:border-ring lg:w-48 xl:w-56 2xl:w-72">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">Пошук у спільноті</span>
          <input ref={input} type="search" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Пошук у спільноті…" className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 text-[11px] 2xl:block">Ctrl K</kbd>
        </label>
      </form>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="top"
          className="bg-[color:var(--shell-surface)]"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            mobileInput.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (mobileTrigger.current?.getClientRects().length) mobileTrigger.current.focus();
            else input.current?.focus();
          }}
        >
          <SheetHeader>
            <SheetTitle>Пошук у спільноті</SheetTitle>
            <SheetDescription>Введіть пошуковий запит.</SheetDescription>
          </SheetHeader>
          <form role="search" className="flex gap-2 px-4 pb-4" onSubmit={(event) => { event.preventDefault(); submit(); }}>
            <input ref={mobileInput} type="search" aria-label="Пошук у спільноті" value={term} onChange={(event) => setTerm(event.target.value)} className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-foreground focus-visible:outline-2 focus-visible:outline-ring" />
            <Button type="submit">Знайти</Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
