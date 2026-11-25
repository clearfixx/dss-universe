/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-states.tsx
 *
 * 🎯 Purpose:
 * Shared Community Hub system states (P1 D02, owner mockup «Системні
 * стани»): skeleton, empty, load error, read-only notice and 404 panel.
 *
 * ⚠️ Important:
 * Flat token surfaces only (P1: no glow). A hidden resource uses the same
 * plain 404 as a missing one, so nothing reveals that it exists.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

const untilFormatter = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** Whole days left, rounded up, never below one while still active. */
export function forumDaysLeft(until: Date, now: Date = new Date()): number {
  return Math.max(1, Math.ceil((until.getTime() - now.getTime()) / DAY_MS));
}

function daysWord(count: number): string {
  const tail = count % 100;
  if (tail >= 11 && tail <= 14) return "днів";
  if (count % 10 === 1) return "день";
  if ([2, 3, 4].includes(count % 10)) return "дні";
  return "днів";
}

/** Centered state panel: icon, title, text and optional actions. */
export function ForumStatePanel({
  icon,
  title,
  children,
  actions,
  tone = "default",
  className,
  headingLevel = 2,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  tone?: "default" | "danger";
  className?: string;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section
      className={cn(
        "flex flex-col items-center gap-3 px-6 py-10 text-center",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-16 items-center justify-center rounded-2xl [&_svg]:size-8",
          tone === "danger"
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/15 text-violet-300",
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <Heading className="text-lg font-semibold text-white">{title}</Heading>
      {children ? (
        <div className="max-w-md text-sm text-slate-400">{children}</div>
      ) : null}
      {actions ? (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {actions}
        </div>
      ) : null}
    </section>
  );
}

/** «Режим «Лише читання»» banner with the end of the restriction. */
export function ForumReadOnlyNotice({
  until,
  children,
}: {
  until: string | Date;
  children?: ReactNode;
}) {
  const end = new Date(String(until));
  const left = forumDaysLeft(end);
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-amber-100"
    >
      <Lock
        className="mt-0.5 size-5 shrink-0 text-warning"
        aria-hidden="true"
      />
      <p>
        <strong className="block text-base text-white">
          Режим «Лише читання»
        </strong>
        {children ?? "Ти тимчасово можеш лише переглядати контент."}{" "}
        {`Обмеження діє до ${untilFormatter.format(end)} (залишилось ${left} ${daysWord(left)}).`}
      </p>
    </div>
  );
}

function Bar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "block rounded-full bg-white/[0.07] motion-safe:animate-pulse",
        className,
      )}
    />
  );
}

/** Topic list placeholder with the same row height as the real list. */
export function ForumListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="overflow-hidden rounded-xl border border-white/[0.07] bg-card">
      {Array.from({ length: rows }, (_, index) => (
        <li
          key={index}
          className="flex items-center gap-3 border-t border-white/[0.05] px-4 py-3.5 first:border-t-0"
        >
          <span className="size-10 shrink-0 rounded-lg bg-white/[0.07] motion-safe:animate-pulse" />
          <span className="min-w-0 flex-1 space-y-2">
            <Bar className="h-3 w-2/5" />
            <Bar className="h-2.5 w-4/5" />
          </span>
          <Bar className="hidden h-3 w-16 sm:block" />
        </li>
      ))}
    </ul>
  );
}

/** Whole-page placeholder while a Community Hub route streams in. */
export function ForumPageSkeleton() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="flex h-16 items-center gap-4 border-b border-white/[0.07] px-4 lg:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/dss-logo-mark.svg"
          alt=""
          width={36}
          height={32}
          className="h-8 w-9 opacity-80"
        />
        <Bar className="h-3 w-28" />
        <Bar className="ml-auto hidden h-9 w-72 rounded-lg md:block" />
        <span className="size-9 rounded-full bg-white/[0.07]" />
      </div>
      <main
        className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-6"
        aria-busy="true"
      >
        <p role="status" className="sr-only">
          Завантаження…
        </p>
        <Bar className="h-3 w-48" />
        <Bar className="h-7 w-72 max-w-full" />
        <div className="flex gap-3">
          <Bar className="h-8 w-28 rounded-lg bg-primary/25" />
          <Bar className="h-8 w-24 rounded-lg" />
          <Bar className="h-8 w-24 rounded-lg" />
        </div>
        <ForumListSkeleton />
      </main>
    </div>
  );
}
