"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-action-dialog.tsx
 *
 * 🎯 Purpose:
 * One confirm dialog for every moderation command: optional fields (reason,
 * target topic, post numbers…), the typed API error, and a router refresh on
 * success.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ForumResult } from "./forum-errors";

export type ForumDialogField = Readonly<{
  name: string;
  label: string;
  kind?: "text" | "textarea" | "select";
  placeholder?: string;
  required?: boolean;
  options?: ReadonlyArray<{ value: string; label: string }>;
  hint?: string;
}>;

export type ForumDialogValues = Record<string, string>;

export function ForumActionDialog({
  trigger,
  title,
  description,
  fields = [],
  confirmLabel,
  destructive,
  run,
  redirectTo,
  open: controlledOpen,
  onOpenChange,
}: {
  /** Omit when the dialog is opened from outside (e.g. a dropdown item). */
  trigger?: (open: () => void) => ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  fields?: readonly ForumDialogField[];
  confirmLabel: string;
  destructive?: boolean;
  run: (values: ForumDialogValues) => Promise<ForumResult<unknown>>;
  /** Navigate here instead of refreshing (e.g. after a merge). */
  redirectTo?: (values: ForumDialogValues) => string | null;
}) {
  const router = useRouter();
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = (next: boolean) => {
    setLocalOpen(next);
    onOpenChange?.(next);
  };
  const [values, setValues] = useState<ForumDialogValues>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const missing = fields.some(
    (field) => field.required && !values[field.name]?.trim(),
  );

  function confirm() {
    setError(null);
    start(async () => {
      const result = await run(values);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setOpen(false);
      setValues({});
      const target = redirectTo?.(values);
      if (target) router.push(target);
      else router.refresh();
    });
  }

  const input =
    "w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-400";

  return (
    <>
      {trigger?.(() => setOpen(true))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="space-y-3">
            {fields.map((field) => (
              <label key={field.name} className="block space-y-1.5 text-sm">
                <span className="text-slate-300">
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                {field.kind === "textarea" ? (
                  <textarea
                    className={`${input} min-h-24`}
                    placeholder={field.placeholder}
                    value={values[field.name] ?? ""}
                    onChange={(event) =>
                      setValues({ ...values, [field.name]: event.target.value })
                    }
                  />
                ) : field.kind === "select" ? (
                  <select
                    className={input}
                    value={values[field.name] ?? ""}
                    onChange={(event) =>
                      setValues({ ...values, [field.name]: event.target.value })
                    }
                  >
                    <option value="">Оберіть…</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={input}
                    placeholder={field.placeholder}
                    value={values[field.name] ?? ""}
                    onChange={(event) =>
                      setValues({ ...values, [field.name]: event.target.value })
                    }
                  />
                )}
                {field.hint ? (
                  <span className="block text-xs text-slate-500">
                    {field.hint}
                  </span>
                ) : null}
              </label>
            ))}
            {error ? (
              <p role="alert" className="text-sm text-rose-300">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Скасувати
            </Button>
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              disabled={pending || missing}
              onClick={confirm}
            >
              {pending ? "Виконуємо…" : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Accepts a topic link or a bare ID and returns the topic ID. */
export function topicIdFrom(value: string): string {
  const trimmed = value.trim();
  const match = /topics\/([0-9a-f-]{36})/i.exec(trimmed);
  return match ? match[1] : trimmed;
}

/** "3, 5-7" → [3, 5, 6, 7]; invalid parts are ignored. */
export function postNumbersFrom(value: string): number[] {
  const numbers = new Set<number>();
  for (const part of value.split(/[\s,]+/)) {
    const range = /^(\d+)-(\d+)$/.exec(part);
    if (range) {
      const [from, to] = [Number(range[1]), Number(range[2])];
      for (
        let n = Math.min(from, to);
        n <= Math.max(from, to) && n - from < 500;
        n++
      )
        numbers.add(n);
    } else if (/^\d+$/.test(part)) numbers.add(Number(part));
  }
  return [...numbers].filter((n) => n > 1).sort((a, b) => a - b);
}
