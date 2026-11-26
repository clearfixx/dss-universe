"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/ranking-settings.tsx
 *
 * 🎯 Purpose:
 * «Рейтинг і XP» tab (P1 C04, mockup «Панель рейтингів»): the «Гарячі»
 * parameters with a live preview over real recent topics, the fixed P1
 * voting rules and the «Найкращі» definition.
 *
 * ⚠️ Important:
 * Only the existing engine parameters are editable; defaults reproduce
 * today's ranking (D2). Weights for views, bookmarks or author level,
 * presets and anti-abuse switches from the mockup are not approved and are
 * not shown as editable. Voting rules are P1 invariants (D1), read-only.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Check, Flame, Lock, RotateCcw, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cn } from "@/lib/utils";

import { saveForumRanking } from "./command-deck-actions";
import type { RankingAdmin } from "./command-deck-data";
import { Card, field } from "./community-hub-admin-kit";
import {
  DEFAULT_RANKING,
  GRAVITY_HOURS,
  REPLY_WEIGHT,
  rankHot,
  rankingError,
  type RankingSettings,
} from "./ranking-model";

const VOTING_RULES = [
  "Голос остаточний: змінити чи відкликати його не можна.",
  "Голосувати можуть акаунти, старші за 7 днів.",
  "За власні дописи голосувати не можна.",
  "Модератор може скасувати голос; дія записується в аудит.",
] as const;

export function RankingSettingsPanel({ data }: { data: RankingAdmin }) {
  const router = useRouter();
  const saved: RankingSettings = data.settings
    ? {
        hotGravitySeconds: data.settings.hotGravitySeconds,
        hotReplyWeight: data.settings.hotReplyWeight,
      }
    : DEFAULT_RANKING;
  const [draft, setDraft] = useState<RankingSettings>(saved);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const problem = rankingError(draft);
  const dirty =
    draft.hotGravitySeconds !== saved.hotGravitySeconds ||
    draft.hotReplyWeight !== saved.hotReplyWeight;
  const isDefault =
    draft.hotGravitySeconds === DEFAULT_RANKING.hotGravitySeconds &&
    draft.hotReplyWeight === DEFAULT_RANKING.hotReplyWeight;

  const current = rankHot(data.topics, saved);
  const preview = problem ? current : rankHot(data.topics, draft);
  const place = new Map(current.map((topic, index) => [topic.id, index]));
  const hours = Math.round((draft.hotGravitySeconds / 3600) * 10) / 10;

  function save() {
    setMessage(null);
    start(async () => {
      const result = await saveForumRanking(draft);
      if (!result.ok) return setMessage(result.error.message);
      setMessage("Збережено. Списки «Гарячі» оновляться одразу.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card
          title="Алгоритм «Гарячі»"
          icon={<Flame className="size-5 text-violet-300" aria-hidden="true" />}
        >
          <p className="-mt-1 mb-4 text-xs text-slate-400">
            Оцінка теми = знак рейтингу × log₁₀(|рейтинг|) + вага відповідей ×
            log₁₀(кількість дописів) + час створення ÷ швидкість старіння.
            Типові значення відтворюють поточне сортування.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-300">Швидкість старіння, годин</span>
              <input
                type="number"
                min={GRAVITY_HOURS.min}
                max={GRAVITY_HOURS.max}
                step={0.5}
                className={cn(field, "mt-1 h-10")}
                value={hours}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    hotGravitySeconds: Math.round(
                      Number(event.target.value) * 3600,
                    ),
                  })
                }
              />
              <span className="mt-1 block text-xs text-slate-500">
                Менше — нові теми швидше витісняють старі. Типово 12,5 год.
              </span>
            </label>
            <label className="block text-sm">
              <span className="text-slate-300">Вага відповідей</span>
              <input
                type="number"
                min={REPLY_WEIGHT.min}
                max={REPLY_WEIGHT.max}
                step={1}
                className={cn(field, "mt-1 h-10")}
                value={draft.hotReplyWeight}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    hotReplyWeight: Number(event.target.value),
                  })
                }
              />
              <span className="mt-1 block text-xs text-slate-500">
                0 — враховуються лише голоси. Типово 0.
              </span>
            </label>
          </div>
          {problem ? (
            <p className="mt-3 text-sm text-amber-200">{problem}</p>
          ) : null}
          {message ? (
            <p role="status" className="mt-3 text-sm text-slate-200">
              {message}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || pending || problem !== null}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              <Check className="size-4" aria-hidden="true" />
              {pending ? "Зберігаємо…" : "Зберегти зміни"}
            </button>
            <button
              type="button"
              onClick={() => setDraft(DEFAULT_RANKING)}
              disabled={isDefault || pending}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm text-white hover:border-violet-400 disabled:opacity-50"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Типові значення
            </button>
          </div>
        </Card>

        <Card
          title="Попередній перегляд «Гарячі»"
          icon={<Flame className="size-5 text-violet-300" aria-hidden="true" />}
        >
          <p className="-mt-1 mb-3 text-xs text-slate-400">
            Останні активні теми, впорядковані з поточними
            {dirty ? " незбереженими" : ""} параметрами.
          </p>
          {preview.length === 0 ? (
            <p className="text-sm text-slate-400">Тем ще немає.</p>
          ) : (
            <ol className="space-y-1.5">
              {preview.slice(0, 6).map((topic, index) => {
                const before = place.get(topic.id) ?? index;
                const shift = before - index;
                return (
                  <li
                    key={topic.id}
                    className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <span className="w-5 text-center font-semibold text-slate-300">
                      {index + 1}
                    </span>
                    <Link
                      href={`/community/forum/topics/${topic.id}`}
                      className="min-w-0 flex-1 truncate text-white hover:text-violet-200"
                    >
                      {topic.title}
                    </Link>
                    <span className="shrink-0 text-xs text-slate-500">
                      {topic.ratingUp - topic.ratingDown} · {topic.postCount}{" "}
                      доп.
                    </span>
                    {shift !== 0 ? (
                      <span
                        className={cn(
                          "w-9 shrink-0 text-right text-xs font-semibold",
                          shift > 0 ? "text-success" : "text-destructive",
                        )}
                      >
                        {shift > 0 ? `↑${shift}` : `↓${-shift}`}
                      </span>
                    ) : (
                      <span className="w-9 shrink-0" />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Правила голосування"
          icon={<Lock className="size-5 text-violet-300" aria-hidden="true" />}
        >
          <p className="-mt-1 mb-3 text-xs text-slate-400">
            Незмінні правила P1, не налаштовуються.
          </p>
          <ul className="space-y-2 text-sm text-slate-200">
            {VOTING_RULES.map((rule) => (
              <li key={rule} className="flex gap-2">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-violet-300"
                  aria-hidden="true"
                />
                {rule}
              </li>
            ))}
          </ul>
        </Card>
        <Card
          title="«Найкращі» та XP"
          icon={
            <Trophy className="size-5 text-violet-300" aria-hidden="true" />
          }
        >
          <ul className="space-y-2 text-sm text-slate-200">
            <li>
              «Найкращі» — теми з найбільшим чистим рейтингом (голоси «за» мінус
              «проти») за обраний період: день, тиждень, місяць, рік чи весь
              час.
            </li>
            <li>
              Нарахування досвіду за дії на форумі налаштовується на сторінці{" "}
              <Link
                href="/command-deck/gamification/xp-rules"
                className="text-violet-300 underline"
              >
                «Правила XP»
              </Link>
              .
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
