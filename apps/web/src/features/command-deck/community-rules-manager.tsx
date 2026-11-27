"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/community-rules-manager.tsx
 *
 * 🎯 Purpose:
 * Command Deck editor of the numbered community rules (owner 2026-11-27).
 * Rules are switched off, never deleted: past bans keep their reference.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ScrollText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";

import { Card, Toggle, field } from "./community-hub-admin-kit";
import {
  saveCommunityRule,
  type CommunityRuleDraft,
} from "./community-rules-actions";

export type AdminCommunityRule = CommunityRuleDraft & Readonly<{ id: string }>;

const EMPTY: CommunityRuleDraft = { code: "", text: "", active: true };

export function CommunityRulesManager({
  rules,
}: {
  rules: readonly AdminCommunityRule[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<CommunityRuleDraft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setEditing(null);
    setDraft(EMPTY);
    setError(null);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    start(async () => {
      const result = await saveCommunityRule(editing, draft);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Правила спільноти</h1>
        <p className="mt-1 text-sm text-slate-400">
          Пронумеровані пункти, на які посилається бан. Пункт не видаляється, а
          вимикається: давні рішення зберігають своє посилання.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card
          title={`Пункти (${rules.length})`}
          icon={
            <ScrollText className="size-4 text-violet-300" aria-hidden="true" />
          }
        >
          {rules.length === 0 ? (
            <p className="text-sm text-slate-400">
              Правил ще немає. Додайте перший пункт.
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className={`flex items-start gap-3 py-3 ${
                    rule.active ? "" : "opacity-55"
                  }`}
                >
                  <span className="w-14 shrink-0 font-semibold tabular-nums text-violet-200">
                    {rule.code}
                  </span>
                  <p className="min-w-0 flex-1 whitespace-pre-line break-words text-sm text-slate-200">
                    {rule.text}
                    {rule.active ? null : (
                      <span className="ml-2 text-xs text-slate-400">
                        (вимкнено)
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(rule.id);
                      setDraft({
                        code: rule.code,
                        text: rule.text,
                        active: rule.active,
                      });
                      setError(null);
                    }}
                    className="shrink-0 text-sm text-violet-300 hover:underline"
                    aria-label={`Редагувати пункт ${rule.code}`}
                  >
                    Редагувати
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={editing ? "Редагування пункту" : "Новий пункт"}>
          <form onSubmit={submit} className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="text-slate-300">Номер</span>
              <input
                value={draft.code}
                onChange={(event) =>
                  setDraft({ ...draft, code: event.target.value })
                }
                placeholder="2.3"
                maxLength={20}
                required
                className={field}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-slate-300">Текст правила</span>
              <textarea
                value={draft.text}
                onChange={(event) =>
                  setDraft({ ...draft, text: event.target.value })
                }
                rows={5}
                minLength={3}
                maxLength={1000}
                required
                className={`${field} h-auto py-2`}
              />
            </label>
            <Toggle
              label="Діє"
              hint="Вимкнений пункт не можна обрати для нового бану."
              checked={draft.active}
              onChange={(active) => setDraft({ ...draft, active })}
            />
            {error ? (
              <p role="alert" className="text-sm text-rose-300">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={reset}
                  disabled={pending}
                >
                  Скасувати
                </Button>
              ) : null}
              <Button type="submit" disabled={pending}>
                {pending ? "Зберігаємо…" : editing ? "Зберегти" : "Додати"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
