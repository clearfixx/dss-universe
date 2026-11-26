"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-post-network-dialog.tsx
 *
 * 🎯 Purpose:
 * «IP+UA» dialog of the post staff group (P1 B11): loads the address,
 * device and User-Agent on open and lets administrators erase them.
 *
 * ⚠️ Important:
 * Loaded only when opened (one audited read per open); the data is kept
 * in component state and dropped when the dialog closes.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  eraseForumPostNetwork,
  readForumPostNetwork,
} from "./forum-network-actions";

type Network = Extract<
  Awaited<ReturnType<typeof readForumPostNetwork>>,
  { ok: true }
>["data"];

const DEVICE_LABEL: Record<string, string> = {
  DESKTOP: "Комп’ютер",
  MOBILE: "Телефон",
  TABLET: "Планшет",
  BOT: "Бот або скрипт",
  UNKNOWN: "Невідомо",
};

const dateFormatter = new Intl.DateTimeFormat("uk-UA", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ForumPostNetworkDialog({
  postId,
  postNumber,
  canErase,
  open,
  onOpenChange,
}: {
  postId: string;
  postNumber: number;
  canErase: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? (
          <NetworkBody
            postId={postId}
            postNumber={postNumber}
            canErase={canErase}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Mounted per open: one audited read, state dropped on close. */
function NetworkBody({
  postId,
  postNumber,
  canErase,
}: {
  postId: string;
  postNumber: number;
  canErase: boolean;
}) {
  const [data, setData] = useState<Network | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    start(async () => {
      const result = await readForumPostNetwork(postId);
      if (result.ok) setData(result.data);
      else setError(result.error.message);
    });
  }, [postId]);

  function erase() {
    setError(null);
    start(async () => {
      const result = await eraseForumPostNetwork(postId, reason);
      if (!result.ok) return setError(result.error.message);
      setData(null);
      setReason("");
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>IP та User-Agent допису #{postNumber}</DialogTitle>
        <DialogDescription>
          Службові дані, звідки написано допис. Кожен перегляд записується в
          журнал аудиту.
        </DialogDescription>
      </DialogHeader>
      {error ? (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      ) : data === undefined ? (
        <p role="status" className="text-sm text-slate-400">
          {pending ? "Завантаження…" : ""}
        </p>
      ) : data === null ? (
        <p className="text-sm text-slate-300">
          Дані не збережено: допис створено до запуску цієї функції або їх
          видалено.
        </p>
      ) : (
        <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
          <dt className="text-slate-400">IP-адреса</dt>
          <dd className="font-mono text-white">{data.ipAddress ?? "—"}</dd>
          <dt className="text-slate-400">Пристрій</dt>
          <dd className="text-white">
            {DEVICE_LABEL[data.device.kind] ?? data.device.kind}
            {data.device.os ? ` · ${data.device.os}` : ""}
            {data.device.browser ? ` · ${data.device.browser}` : ""}
          </dd>
          <dt className="text-slate-400">User-Agent</dt>
          <dd className="font-mono text-xs break-all text-slate-300">
            {data.userAgent ?? "—"}
          </dd>
          <dt className="text-slate-400">Збережено</dt>
          <dd className="text-slate-300">
            {dateFormatter.format(new Date(String(data.capturedAt)))}
          </dd>
        </dl>
      )}
      {canErase && data ? (
        <div className="space-y-2 border-t border-white/[0.07] pt-3">
          <label className="block text-sm text-slate-300">
            Причина видалення даних *
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none"
            />
          </label>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !reason.trim()}
            onClick={erase}
          >
            Видалити IP та User-Agent
          </Button>
        </div>
      ) : null}
    </>
  );
}
