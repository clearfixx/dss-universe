/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Moderation
 * 📄 File: apps/web/src/app/community/my-sanctions/page.tsx
 *
 * 🎯 Purpose:
 * The member's own sanctions (P1 B09 self-view): read-only banner, number
 * of active warnings and the personal journal with reasons and terms.
 *
 * ⚠️ Important:
 * Signed-in only. Shows only the viewer's records and never staff data
 * (who issued or revoked a sanction).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { loadSessionViewer } from "@/features/auth/session-data";
import { searchPage } from "@/features/forum/forum-search-model";
import {
  ForumReadOnlyNotice,
  ForumStatePanel,
} from "@/features/forum/forum-states";
import {
  SANCTIONS_PAGE_SIZE,
  loadViewerSanctions,
} from "@/features/moderation/sanctions-data";
import {
  SANCTION_KIND_LABEL,
  SANCTION_STATUS_LABEL,
  sanctionStatus,
} from "@/features/moderation/sanctions-model";
import { cn } from "@/lib/utils";

type Props = { searchParams: Promise<{ page?: string }> };

export const metadata: Metadata = {
  title: "Мої санкції | Спільнота DSS Universe",
  robots: { index: false },
};

const PATH = "/community/my-sanctions";

const dateFormatter = new Intl.DateTimeFormat("uk-UA", {
  dateStyle: "medium",
  timeStyle: "short",
});
const when = (value: unknown) => dateFormatter.format(new Date(String(value)));

export default async function MySanctionsRoute({ searchParams }: Props) {
  const page = searchPage((await searchParams).page);
  const viewer = await loadSessionViewer();
  if (!viewer) redirect(`/login?returnTo=${encodeURIComponent(PATH)}`);
  const data = await loadViewerSanctions(page);
  const status = data?.viewerSanctionStatus;
  const journal = data?.viewerSanctionJournal;
  const items = journal?.items ?? [];
  const pages = Math.max(
    1,
    Math.ceil((journal?.total ?? 0) / SANCTIONS_PAGE_SIZE),
  );
  const href = (target: number) =>
    target > 1 ? `${PATH}?page=${target}` : PATH;

  return (
    <DssApplicationShell
      pageTitle={{ pathname: PATH, title: "Мої санкції" }}
      breadcrumbs={[
        { href: "/community", label: "Спільнота" },
        { label: "Мої санкції" },
      ]}
    >
      <div className="mx-auto max-w-4xl space-y-5">
        <header>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Мої санкції
          </h1>
          <p className="text-sm text-slate-400">
            Попередження та обмеження вашого акаунта, їхні причини й терміни. Цю
            сторінку бачите лише ви.
          </p>
        </header>

        {status?.readOnlyUntil ? (
          <ForumReadOnlyNotice
            until={String(status.readOnlyUntil)}
            showDetailsLink={false}
          />
        ) : null}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.07] bg-card p-4">
            <dt className="text-xs text-slate-400">Активні попередження</dt>
            <dd className="text-2xl font-bold">
              {status?.activeWarnings ?? 0}
            </dd>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-card p-4">
            <dt className="text-xs text-slate-400">Режим «Лише читання»</dt>
            <dd className="text-lg font-semibold">
              {status?.readOnlyUntil
                ? `До ${when(status.readOnlyUntil)}`
                : "Не діє"}
            </dd>
          </div>
        </dl>

        {items.length === 0 ? (
          <div className="rounded-xl border border-white/[0.07] bg-card">
            <ForumStatePanel icon={<ShieldCheck />} title="Санкцій немає">
              У вашого акаунта немає попереджень чи обмежень.
            </ForumStatePanel>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const state = sanctionStatus(item);
              const Icon = item.kind === "READ_ONLY" ? Ban : TriangleAlert;
              return (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-xl border border-white/[0.07] bg-card p-4"
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-5 shrink-0",
                      item.kind === "READ_ONLY"
                        ? "text-destructive"
                        : "text-warning",
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="flex flex-wrap items-center gap-2">
                      <strong className="text-white">
                        {SANCTION_KIND_LABEL[item.kind]}
                      </strong>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs",
                          state === "active"
                            ? "bg-warning/15 text-amber-100"
                            : "bg-white/[0.06] text-slate-300",
                        )}
                      >
                        {SANCTION_STATUS_LABEL[state]}
                      </span>
                    </p>
                    <p className="mt-1 text-slate-300">{item.reason}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Видано {when(item.issuedAt)} · діє до{" "}
                      {when(item.expiresAt)}
                      {item.revokeReason
                        ? ` · Скасовано: ${item.revokeReason}`
                        : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {pages > 1 ? (
          <nav
            aria-label="Сторінки"
            className="flex items-center justify-center gap-2"
          >
            {page > 1 ? (
              <Link
                href={href(page - 1)}
                aria-label="Попередня сторінка"
                className="flex size-9 items-center justify-center rounded-lg border border-white/10 hover:border-violet-400"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
            <span className="text-sm text-slate-300">
              Сторінка {page} з {pages}
            </span>
            {page < pages ? (
              <Link
                href={href(page + 1)}
                aria-label="Наступна сторінка"
                className="flex size-9 items-center justify-center rounded-lg border border-white/10 hover:border-violet-400"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </DssApplicationShell>
  );
}
