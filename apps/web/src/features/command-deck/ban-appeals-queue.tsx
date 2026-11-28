"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/ban-appeals-queue.tsx
 *
 * 🎯 Purpose:
 * Appeals of permanent bans: the facts, the appeal with screenshots and the
 * decision (owner 2026-11-27). Rejecting needs a reason the banned person
 * will read; accepting lifts the ban.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { formatBanDate } from "@/features/ban/ban-contract";
import type { AdminBanAppealsQuery } from "@/gql/graphql";

import { decideAppeal, openAppealScreenshot } from "./ban-admin-actions";
import { field } from "./community-hub-admin-kit";

type Appeal = AdminBanAppealsQuery["banAppeals"]["items"][number];

function AppealCard({ appeal }: { appeal: Appeal }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  const open = appeal.status === "PENDING";
  const ready = reason.trim().length >= 3;

  function decide(accept: boolean) {
    if (confirm !== accept) {
      setConfirm(accept);
      return;
    }
    setError(null);
    start(async () => {
      const result = await decideAppeal(appeal.id, accept, reason.trim());
      if (!result.ok) setError(result.error.message);
      setConfirm(null);
      router.refresh();
    });
  }

  function show(fileId: string) {
    setError(null);
    // Open synchronously so the browser does not block the new tab.
    const tab = window.open("", "_blank");
    start(async () => {
      const result = await openAppealScreenshot(appeal.id, fileId);
      if (result.ok && tab) {
        tab.opener = null;
        tab.location.href = result.data;
        return;
      }
      tab?.close();
      setError("Не вдалося відкрити картинку.");
    });
  }

  return (
    <article className="space-y-3 rounded-xl border border-white/[0.07] bg-card p-4">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-semibold">
          {appeal.subjectName ?? "Учасник"}
          {appeal.subjectUsername ? (
            <span className="ml-2 text-sm font-normal text-slate-400">
              @{appeal.subjectUsername}
            </span>
          ) : null}
        </h2>
        <span className="text-xs text-slate-500">{appeal.reference}</span>
        <span className="ml-auto text-xs text-slate-400">
          Подано {formatBanDate(appeal.submittedAt)}
        </span>
      </header>

      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
        <dt className="text-slate-400">Забанив</dt>
        <dd>
          {appeal.issuedByName ?? "—"}, {formatBanDate(appeal.bannedAt)}
        </dd>
        <dt className="text-slate-400">Правило {appeal.ruleCode}</dt>
        <dd className="break-words">{appeal.ruleText}</dd>
        <dt className="text-slate-400">Коментар</dt>
        <dd className="whitespace-pre-line break-words">{appeal.banComment}</dd>
        <dt className="text-slate-400">Де порушення</dt>
        <dd className="break-all">
          {appeal.contextPath?.startsWith("/community/") ? (
            <a
              href={appeal.contextPath}
              className="text-violet-300 hover:underline"
            >
              Відкрити допис
            </a>
          ) : (
            (appeal.contextPath ?? "Не вказано")
          )}
        </dd>
      </dl>

      <p className="whitespace-pre-line break-words rounded-lg bg-slate-950/60 p-3 text-sm">
        {appeal.text}
      </p>

      {appeal.files.length ? (
        <ul className="flex flex-wrap gap-2">
          {appeal.files.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                onClick={() => show(file.id)}
                disabled={file.status !== "READY" || pending}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:border-violet-400/50 disabled:opacity-50"
              >
                {file.filename}
                {file.status === "CHECKING" ? " (перевіряється)" : ""}
                {file.status === "REJECTED" ? " (не пройшла перевірку)" : ""}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <div className="space-y-2">
          <label className="block space-y-1 text-sm">
            <span className="text-slate-300">
              Пояснення рішення (під час відмови його побачить заблокований)
            </span>
            <textarea
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setConfirm(null);
              }}
              rows={2}
              maxLength={1000}
              className={`${field} h-auto py-2`}
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!ready || pending}
              onClick={() => decide(false)}
            >
              {confirm === false ? "Так, відхилити" : "Відхилити"}
            </Button>
            <Button
              type="button"
              disabled={!ready || pending}
              onClick={() => decide(true)}
            >
              {confirm === true ? "Так, зняти бан" : "Ухвалити (зняти бан)"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-300">
          {appeal.status === "ACCEPTED" ? "Ухвалено" : "Відхилено"}
          {appeal.decidedByName ? ` · ${appeal.decidedByName}` : ""}
          {appeal.decidedAt ? ` · ${formatBanDate(appeal.decidedAt)}` : ""}
          <span className="mt-1 block whitespace-pre-line break-words text-slate-400">
            {appeal.decisionReason}
          </span>
        </p>
      )}
      {error ? (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      ) : null}
    </article>
  );
}

export function BanAppealsQueue({ appeals }: { appeals: readonly Appeal[] }) {
  return (
    <div className="space-y-4">
      {appeals.map((appeal) => (
        <AppealCard key={appeal.id} appeal={appeal} />
      ))}
    </div>
  );
}
