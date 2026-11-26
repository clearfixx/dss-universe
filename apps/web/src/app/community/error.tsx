"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/app/community/error.tsx
 *
 * 🎯 Purpose:
 * Retryable load error for Community Hub routes (P1 D02, mockup state 3):
 * «Оновити» re-fetches the segment, «Деталі» shows the error reference.
 *
 * ⚠️ Important:
 * Server errors reach the client only as a digest, never as a message.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { AlertTriangle, Info, RotateCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ForumStatePanel } from "@/features/forum/forum-states";

export default function CommunityError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [details, setDetails] = useState(false);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.07] bg-card">
        <ForumStatePanel
          headingLevel={1}
          tone="danger"
          icon={<AlertTriangle />}
          title="Не вдалося завантажити сторінку"
          actions={
            <>
              <button
                type="button"
                onClick={() => retry()}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-medium text-white hover:border-violet-400"
              >
                <RotateCw className="size-4" aria-hidden="true" />
                Оновити
              </button>
              <button
                type="button"
                aria-expanded={details}
                onClick={() => setDetails((open) => !open)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-medium text-white hover:border-violet-400"
              >
                <Info className="size-4" aria-hidden="true" />
                Деталі
              </button>
            </>
          }
        >
          <p role="alert">
            Сталася помилка під час отримання даних. Спробуй ще раз.
          </p>
          {details ? (
            <p className="mt-3 rounded-lg bg-white/[0.04] px-3 py-2 text-left text-xs text-slate-300">
              Код помилки: {error.digest ?? "немає"}. Якщо помилка повторюється,
              передай цей код адміністрації.{" "}
              <Link href="/community" className="text-violet-300 underline">
                До форуму
              </Link>
            </p>
          ) : null}
        </ForumStatePanel>
      </div>
    </div>
  );
}
