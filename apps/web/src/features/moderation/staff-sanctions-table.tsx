"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Moderation
 * 📄 File: apps/web/src/features/moderation/staff-sanctions-table.tsx
 *
 * 🎯 Purpose:
 * Staff sanctions journal table (P1 B09): date, member, kind, reason, term,
 * status and issuer, with «Скасувати» (reason required) for active ones.
 *
 * ⚠️ Important:
 * The API decides who may revoke; a refusal is shown in the dialog.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Ban, ShieldAlert, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { ForumActionDialog } from "@/features/forum/forum-action-dialog";
import { ForumAvatar } from "@/features/forum/forum-avatar";
import { forumMemberName } from "@/features/forum/forum-format";
import { cn } from "@/lib/utils";

import { revokeSanction } from "./sanctions-actions";
import type { StaffSanctionsPage } from "./sanctions-data";
import {
  SANCTION_KIND_LABEL,
  SANCTION_ORIGIN_LABEL,
  SANCTION_STATUS_LABEL,
  sanctionStatus,
} from "./sanctions-model";

type Row = StaffSanctionsPage["items"][number];

const dateFormatter = new Intl.DateTimeFormat("uk-UA", {
  dateStyle: "short",
  timeStyle: "short",
});
const when = (value: unknown) => dateFormatter.format(new Date(String(value)));

const STATUS_TONE = {
  active: "bg-warning/15 text-amber-100",
  revoked: "bg-white/[0.06] text-slate-300",
  consumed: "bg-primary/20 text-violet-100",
  expired: "bg-white/[0.06] text-slate-400",
} as const;

export function StaffSanctionsTable({
  items,
  memberHrefs,
}: {
  items: readonly Row[];
  memberHrefs: Readonly<Record<string, string>>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-card">
      <div className="hidden grid-cols-[7.5rem_minmax(0,10rem)_8.5rem_minmax(0,1fr)_7rem_minmax(0,8rem)_7rem] gap-3 border-b border-white/[0.07] px-4 py-2.5 text-xs text-slate-400 lg:grid">
        <span>Дата</span>
        <span>Учасник</span>
        <span>Дія</span>
        <span>Причина</span>
        <span>Статус</span>
        <span>Видав</span>
        <span className="sr-only">Дії</span>
      </div>
      <ul>
        {items.map((item) => {
          const status = sanctionStatus(item);
          const Icon = item.kind === "READ_ONLY" ? Ban : TriangleAlert;
          return (
            <li
              key={item.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 border-b border-white/[0.05] px-4 py-3 text-sm last:border-b-0 lg:grid-cols-[7.5rem_minmax(0,10rem)_8.5rem_minmax(0,1fr)_7rem_minmax(0,8rem)_7rem] lg:items-center"
            >
              <span className="text-slate-300 lg:order-none">
                {when(item.issuedAt)}
              </span>
              <span className="row-span-2 self-start lg:hidden">
                <StatusBadge status={status} />
              </span>
              <span className="flex min-w-0 items-center gap-2">
                {item.subject ? (
                  <ForumAvatar
                    member={item.subject}
                    className="size-7 text-[10px]"
                  />
                ) : null}
                <Link
                  href={memberHrefs[item.subjectId] ?? "#"}
                  className="truncate text-white hover:text-violet-200"
                  title="Показати санкції учасника"
                >
                  {item.subject
                    ? forumMemberName(item.subject)
                    : "Видалений акаунт"}
                </Link>
              </span>
              <span className="flex items-center gap-2 text-slate-200">
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    item.kind === "READ_ONLY"
                      ? "text-destructive"
                      : "text-warning",
                  )}
                  aria-hidden="true"
                />
                {SANCTION_KIND_LABEL[item.kind]}
              </span>
              <span className="col-span-2 min-w-0 text-slate-300 lg:col-span-1">
                <span className="line-clamp-2">{item.reason}</span>
                <span className="block text-xs text-slate-500">
                  До {when(item.expiresAt)}
                  {item.revokeReason
                    ? ` · Скасовано: ${item.revokeReason}`
                    : ""}
                </span>
              </span>
              <span className="hidden lg:block">
                <StatusBadge status={status} />
              </span>
              <span className="col-span-2 min-w-0 truncate text-xs text-slate-400 lg:col-span-1">
                {item.issuer
                  ? forumMemberName(item.issuer)
                  : SANCTION_ORIGIN_LABEL[item.origin]}
              </span>
              <span className="col-span-2 lg:col-span-1 lg:justify-self-end">
                {status === "active" ? (
                  <ForumActionDialog
                    trigger={(open) => (
                      <button
                        type="button"
                        onClick={open}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-xs font-medium text-white hover:border-violet-400"
                      >
                        <ShieldAlert className="size-3.5" aria-hidden="true" />
                        Скасувати
                      </button>
                    )}
                    title="Скасувати санкцію?"
                    description={`${SANCTION_KIND_LABEL[item.kind]} для ${
                      item.subject ? forumMemberName(item.subject) : "учасника"
                    }. Скасування записується в журнал аудиту.`}
                    fields={[
                      {
                        name: "reason",
                        label: "Причина скасування",
                        kind: "textarea",
                        required: true,
                      },
                    ]}
                    confirmLabel="Скасувати санкцію"
                    run={(values) =>
                      revokeSanction(item.id, values.reason ?? "")
                    }
                  />
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: ReturnType<typeof sanctionStatus>;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-md px-2 py-0.5 text-xs whitespace-nowrap",
        STATUS_TONE[status],
      )}
    >
      {SANCTION_STATUS_LABEL[status]}
    </span>
  );
}
