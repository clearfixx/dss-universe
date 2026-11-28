"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/active-bans-list.tsx
 *
 * 🎯 Purpose:
 * Bans in force with lifting, which needs a recorded reason.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { formatBanDate } from "@/features/ban/ban-contract";
import type { AdminAccountBansQuery } from "@/gql/graphql";

import { liftBan } from "./ban-admin-actions";
import { field } from "./community-hub-admin-kit";

type BanItem = AdminAccountBansQuery["accountBans"]["items"][number];

function BanRow({ ban }: { ban: BanItem }) {
  const router = useRouter();
  const [lifting, setLifting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirm() {
    setError(null);
    start(async () => {
      const result = await liftBan(ban.id, reason.trim());
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="space-y-2 rounded-xl border border-white/[0.07] bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{ban.subjectName ?? "Учасник"}</span>
        <span className="text-xs text-slate-500">{ban.reference}</span>
        <span className="text-xs text-slate-400">
          {formatBanDate(ban.issuedAt)} · забанив {ban.issuedByName ?? "—"}
        </span>
        {lifting ? null : (
          <Button
            type="button"
            variant="outline"
            className="ml-auto"
            onClick={() => setLifting(true)}
          >
            Зняти бан
          </Button>
        )}
      </div>
      <p className="break-words text-slate-300">
        Правило {ban.ruleCode}: {ban.ruleText}
      </p>
      <p className="whitespace-pre-line break-words text-slate-400">
        {ban.comment}
      </p>
      {lifting ? (
        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-slate-300">Причина зняття</span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              className={field}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLifting(false)}
              disabled={pending}
            >
              Скасувати
            </Button>
            <Button
              type="button"
              onClick={confirm}
              disabled={pending || reason.trim().length < 3}
            >
              Так, зняти бан
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-rose-300">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function ActiveBansList({ bans }: { bans: readonly BanItem[] }) {
  return (
    <ul className="space-y-3">
      {bans.map((ban) => (
        <BanRow key={ban.id} ban={ban} />
      ))}
    </ul>
  );
}
