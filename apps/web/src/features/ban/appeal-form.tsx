"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Ban
 * 📄 File: apps/web/src/features/ban/appeal-form.tsx
 *
 * 🎯 Purpose:
 * The one appeal of a permanent ban: text, screenshots, submit (owner
 * mockup).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Info, Mail, Paperclip, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ChangeEvent } from "react";

import { leaveBanScreen, removeAppealFile, submitAppeal } from "./ban-actions";
import {
  APPEAL_FILE_ACCEPT,
  APPEAL_MAX_FILES,
  APPEAL_TEXT_MAX,
  APPEAL_TEXT_MIN,
  appealFileError,
} from "./ban-contract";

export type AppealFileItem = Readonly<{
  id: string;
  filename: string;
  size: number;
  status: string;
}>;

const FILE_STATUS: Record<string, string> = {
  CHECKING: "перевіряється",
  READY: "перевірено",
  REJECTED: "не пройшла перевірку",
};

const ADVICE = [
  "Будьте чесними та ввічливими.",
  "Опишіть ситуацію докладно.",
  "Додайте скриншоти, які це підтверджують.",
  "Апеляцію можна подати лише один раз.",
];

export function AppealForm({ files }: { files: readonly AppealFileItem[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const busy = pending || uploading;
  const ready = text.trim().length >= APPEAL_TEXT_MIN;

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const chosen = Array.from(input.files ?? []);
    input.value = "";
    setError(null);
    if (chosen.length + files.length > APPEAL_MAX_FILES) {
      setError(`Можна додати не більше ${APPEAL_MAX_FILES} картинок.`);
      return;
    }
    setUploading(true);
    for (const file of chosen) {
      const refusal = appealFileError(file);
      if (refusal) {
        setError(`${file.name}: ${refusal}`);
        break;
      }
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/banned/files", {
        method: "POST",
        body,
      }).catch(() => null);
      if (!response?.ok) {
        setError(`${file.name}: не вдалося завантажити.`);
        break;
      }
    }
    setUploading(false);
    router.refresh();
  }

  function remove(id: string) {
    setError(null);
    start(async () => {
      const result = await removeAppealFile(id);
      if (!result.ok) setError(result.message);
      router.refresh();
    });
  }

  function submit() {
    setError(null);
    start(async () => {
      const result = await submitAppeal(text);
      if (!result.ok) {
        setError(result.message);
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="appeal-title"
      className="rounded-xl border border-violet-400/20 bg-slate-950/80 p-4 backdrop-blur sm:p-6"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0 space-y-3">
          <div className="flex gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-violet-600/25 text-violet-200">
              <Mail className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="appeal-title" className="text-lg font-semibold">
                Подати апеляцію
              </h2>
              <p className="text-sm text-slate-400">
                Якщо ви вважаєте, що бан видано помилково, напишіть нам.
                Адміністрація розгляне звернення.
              </p>
            </div>
          </div>

          <label className="block">
            <span className="sr-only">Текст апеляції</span>
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setConfirming(false);
              }}
              maxLength={APPEAL_TEXT_MAX}
              rows={4}
              placeholder="Поясніть, чому цей бан варто переглянути…"
              className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400"
            />
            <span className="block text-right text-xs text-slate-500 tabular-nums">
              {text.length}/{APPEAL_TEXT_MAX}
            </span>
          </label>

          <label
            className={`flex items-center gap-3 rounded-lg border border-dashed border-white/15 bg-slate-900/50 p-3 ${
              busy || files.length >= APPEAL_MAX_FILES
                ? "opacity-60"
                : "cursor-pointer hover:border-violet-400/60"
            }`}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
              <Paperclip className="size-5" aria-hidden="true" />
            </span>
            <span className="text-sm">
              <span className="block font-semibold">
                {uploading
                  ? "Завантажуємо…"
                  : "Додати скриншоти (необов'язково)"}
              </span>
              <span className="block text-xs text-slate-400">
                JPG, PNG або WebP, до {APPEAL_MAX_FILES} файлів по 10 МБ
              </span>
            </span>
            <input
              type="file"
              accept={APPEAL_FILE_ACCEPT}
              multiple
              disabled={busy || files.length >= APPEAL_MAX_FILES}
              onChange={upload}
              className="sr-only"
            />
          </label>

          {files.length ? (
            <ul className="space-y-1.5">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2 rounded-md bg-white/[0.04] px-3 py-1.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {file.filename}
                  </span>
                  <span
                    className={`shrink-0 text-xs ${
                      file.status === "REJECTED"
                        ? "text-rose-300"
                        : "text-slate-400"
                    }`}
                  >
                    {FILE_STATUS[file.status] ?? file.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(file.id)}
                    disabled={busy}
                    aria-label={`Прибрати ${file.filename}`}
                    className="shrink-0 rounded p-1 text-slate-400 hover:text-white"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <aside className="h-fit rounded-lg border border-white/[0.08] bg-slate-900/50 p-4 text-sm">
          <h3 className="flex items-center gap-2 font-semibold">
            <Info className="size-4 text-violet-300" aria-hidden="true" />
            Перед поданням апеляції
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300 marker:text-violet-400">
            {ADVICE.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </aside>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {error}
        </p>
      ) : null}
      {confirming ? (
        <p role="status" className="mt-3 text-sm text-amber-200">
          Апеляцію не можна буде змінити чи подати повторно. Натисніть ще раз,
          щоб надіслати.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-between gap-3">
        <form action={leaveBanScreen}>
          <button
            type="submit"
            className="min-h-11 rounded-lg border border-white/15 px-5 text-sm font-semibold hover:border-violet-400"
          >
            Скасувати
          </button>
        </form>
        <button
          type="button"
          onClick={() => (confirming ? submit() : setConfirming(true))}
          disabled={busy || !ready}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-violet-600 px-5 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
        >
          <Send className="size-4" aria-hidden="true" />
          {pending
            ? "Надсилаємо…"
            : confirming
              ? "Так, надіслати"
              : "Подати апеляцію"}
        </button>
      </div>
    </section>
  );
}
