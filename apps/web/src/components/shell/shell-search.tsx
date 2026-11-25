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
      className="hidden min-w-0 md:block"
      onSubmit={(event) => {
        event.preventDefault();
        const value = term.trim();
        if (value) router.push(`/community/search?q=${encodeURIComponent(value)}`);
      }}
    >
      <label className="flex h-10 w-56 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-slate-400 focus-within:border-violet-400 2xl:w-72">
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">Пошук у спільноті</span>
        <input
          ref={input}
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Пошук у спільноті…"
          className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
        />
        <kbd className="rounded border border-white/10 px-1.5 text-[11px] text-slate-500">Ctrl K</kbd>
      </label>
    </form>
  );
}
