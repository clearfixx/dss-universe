"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function ShellSearch() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        if (!input.current?.getClientRects().length) return;
        event.preventDefault();
        input.current.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form
      role="search"
      className="min-w-0 shrink"
      onSubmit={(event) => {
        event.preventDefault();
        const value = term.trim();
        if (value) router.push(`/community/search?q=${encodeURIComponent(value)}`);
      }}
    >
      <label className="flex h-10 w-10 min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 text-sm text-slate-400 focus-within:border-violet-400 focus-within:w-28 sm:w-40 sm:px-3 lg:w-48 xl:w-56 2xl:w-72">
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">Пошук у спільноті</span>
        <input
          ref={input}
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Пошук у спільноті…"
          className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none placeholder:text-slate-500" aria-label="Пошук у спільноті"
        />
        <kbd className="hidden rounded border border-white/10 px-1.5 text-[11px] text-slate-500 lg:block">Ctrl K</kbd>
      </label>
    </form>
  );
}
