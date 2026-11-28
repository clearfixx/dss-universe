"use client";

import { Bell, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Header icons with real counters only. Unread activity comes from the viewer
 * activity feed and opens Mission Control, where the feed is shown. Direct
 * messages have no API yet, so that icon stays disabled without a count.
 */
export function ShellHeaderActions({ unreadCount }: { unreadCount: number | null }) {
  return (
    <div className="flex items-center gap-1">
      <span className="relative inline-flex">
        <Button type="button" variant="ghost" size="icon" disabled aria-label="Повідомлення: скоро">
          <MessagesSquare aria-hidden="true" />
        </Button>
      </span>
      <span className="relative inline-flex">
        <Button asChild variant="ghost" size="icon">
          <Link
            href="/"
            aria-label={
              unreadCount === null
                ? "Активність"
                : unreadCount > 0
                  ? `Активність: ${unreadCount} непрочитаних`
                  : "Активність: немає непрочитаних"
            }
          >
            <Bell aria-hidden="true" />
          </Link>
        </Button>
        {unreadCount && unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </span>
    </div>
  );
}
