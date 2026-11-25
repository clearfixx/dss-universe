/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/app/community/not-found.tsx
 *
 * 🎯 Purpose:
 * Community Hub 404 inside the application shell (P1 D02, mockup state 6).
 *
 * ⚠️ Important:
 * Hidden sections and topics land here too, with the same wording as a
 * missing one (P1 §5: indistinguishable from a nonexistent resource).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Home } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { ForumStatePanel } from "@/features/forum/forum-states";

export const metadata: Metadata = { title: "Сторінку не знайдено" };

export default function CommunityNotFound() {
  return (
    <DssApplicationShell
      breadcrumbs={[
        { href: "/community", label: "Спільнота" },
        { label: "404" },
      ]}
    >
      <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-white/[0.07] bg-card">
        <ForumStatePanel
          headingLevel={1}
          icon={
            <span className="text-2xl font-bold tracking-tight text-violet-200">
              404
            </span>
          }
          title="Сторінку не знайдено"
          actions={
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-medium text-white hover:border-violet-400"
            >
              <Home className="size-4" aria-hidden="true" />
              На головну
            </Link>
          }
        >
          Розділ або тема не існує чи недоступна. Можливо, її було переміщено
          або приховано.
        </ForumStatePanel>
      </div>
    </DssApplicationShell>
  );
}
