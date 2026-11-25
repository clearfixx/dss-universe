"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/xp-rules-settings.tsx
 *
 * 🎯 Purpose:
 * Command Deck › Gamification › Правила XP (owner mockup «Командна панель
 * правил XP», P1 C06): the global Community Points rules — forum rows
 * included — and the level thresholds, saved with one "Зберегти зміни".
 *
 * ⚠️ Important:
 * Only what the existing XP engine supports is editable: points, daily
 * limit and on/off per rule, and level thresholds. Mockup parts without an
 * engine contract (multipliers, bonuses, rewards, XP journal, statistics,
 * new rules) are «скоро» and never faked.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Check, Layers, ListChecks, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { cn } from "@/lib/utils";

import { Card, Tabs, Toggle, field } from "./community-hub-admin-kit";
import { saveXpSettings } from "./gamification-actions";
import type { XpRulesData } from "./gamification-data";
import { ruleCategory, ruleLabel } from "./gamification-model";

type XpTab = "overview" | "rules" | "levels" | "rewards" | "limits" | "journal";

const TABS: ReadonlyArray<{ id: XpTab; label: string; soon?: boolean }> = [
  { id: "overview", label: "Огляд", soon: true },
  { id: "rules", label: "Правила нарахування" },
  { id: "levels", label: "Рівні та прогрес" },
  { id: "rewards", label: "Нагороди", soon: true },
  { id: "limits", label: "Обмеження і захист", soon: true },
  { id: "journal", label: "Журнал XP", soon: true },
];

const CATEGORY_TONE: Record<string, string> = {
  forum: "bg-primary/25 text-violet-100",
  comments: "bg-brand-cyan/20 text-cyan-100",
  content: "bg-indigo-500/25 text-indigo-100",
  reputation: "bg-warning/20 text-amber-100",
  other: "bg-white/[0.08] text-slate-200",
};

type Rule = XpRulesData["communityPointRules"][number];

export function XpRulesSettings({ data }: { data: XpRulesData }) {
  const router = useRouter();
  const [tab, setTab] = useState<XpTab>("rules");
  const initialRules = useMemo(
    () =>
      data.communityPointRules.map((rule) => ({
        key: rule.key,
        points: rule.points,
        dailyLimit: rule.dailyLimit,
        enabled: rule.enabled,
      })),
    [data.communityPointRules],
  );
  const [rules, setRules] = useState(initialRules);
  const [levels, setLevels] = useState(
    data.levelDefinitions.map(({ level, threshold }) => ({ level, threshold })),
  );
  const [category, setCategory] = useState("all");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dirtyRules = rules.filter(
    (rule, index) =>
      JSON.stringify(rule) !== JSON.stringify(initialRules[index]),
  );
  const levelChanges = levels
    .map((item) => ({
      level: item.level,
      to: item.threshold,
      from:
        data.levelDefinitions.find(({ level }) => level === item.level)
          ?.threshold ?? item.threshold,
    }))
    .filter(({ to, from }) => to !== from);
  const dirty = dirtyRules.length > 0 || levelChanges.length > 0;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const categories = [
    ...new Map(
      data.communityPointRules.map(({ key }) => {
        const item = ruleCategory(key);
        return [item.id, item] as const;
      }),
    ).values(),
  ];
  const active = rules.filter(({ enabled }) => enabled).length;
  const byKey = new Map<string, Rule>(
    data.communityPointRules.map((rule) => [rule.key, rule]),
  );

  function save() {
    setMessage(null);
    start(async () => {
      const result = await saveXpSettings({
        rules: dirtyRules,
        levels: levelChanges,
      });
      if (!result.ok) return setMessage(result.error.message);
      setMessage("Зміни збережено.");
      router.refresh();
    });
  }

  const update = (key: string, change: Partial<(typeof rules)[number]>) =>
    setRules((list) =>
      list.map((rule) => (rule.key === key ? { ...rule, ...change } : rule)),
    );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-4">
        <span className="hidden size-14 items-center justify-center rounded-2xl bg-primary/25 text-violet-200 sm:flex">
          <Trophy className="size-7" aria-hidden="true" />
        </span>
        <div className="min-w-64 flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Правила XP
          </h1>
          <p className="text-sm text-slate-400">
            Налаштування нарахування досвіду й рівнів за активність у DSS
            Universe.
          </p>
        </div>
        <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm">
          <span className="size-2 rounded-full bg-success" aria-hidden="true" />
          {active > 0 ? "Система активна" : "Усі правила вимкнено"}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          <Check className="size-4" aria-hidden="true" />
          {pending ? "Зберігаємо…" : "Зберегти зміни"}
        </button>
      </header>
      {message ? (
        <p
          role="status"
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            message === "Зміни збережено."
              ? "bg-success/10 text-emerald-200"
              : "bg-destructive/10 text-rose-200",
          )}
        >
          {message}
        </p>
      ) : dirty ? (
        <p className="text-xs text-amber-200">Є незбережені зміни.</p>
      ) : null}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {(
          [
            ["Активні правила", `${active} / ${rules.length}`, ListChecks],
            ["Рівнів у системі", String(levels.length), Layers],
            [
              "Найвищий рівень",
              levels.length ? `Lv. ${levels[levels.length - 1].level}` : "—",
              Trophy,
            ],
            [
              "Поріг найвищого рівня",
              levels.length
                ? `${levels[levels.length - 1].threshold.toLocaleString("uk-UA")} XP`
                : "—",
              Trophy,
            ],
          ] as const
        ).map(([label, value, Icon]) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-card p-3 sm:p-4"
          >
            <span className="hidden size-11 items-center justify-center rounded-xl bg-primary/15 text-violet-200 sm:flex">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col-reverse">
              <dt className="text-xs text-slate-400">{label}</dt>
              <dd className="text-xl font-bold">{value}</dd>
            </div>
          </div>
        ))}
      </dl>

      {tab === "rules" ? (
        <Card
          title="Правила нарахування XP"
          icon={
            <ListChecks className="size-5 text-violet-300" aria-hidden="true" />
          }
          action={
            <select
              aria-label="Категорія"
              className={cn(field, "h-9 w-44")}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">Усі категорії</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          }
        >
          <p className="-mt-1 mb-3 text-xs text-slate-400">
            Скільки досвіду отримує учасник за дії в спільноті. Правила
            пов’язані з подіями модулів; нові дії з’являються тут разом із
            модулями.
          </p>
          <div className="-mx-4 -mb-4 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="text-xs text-slate-400">
                  <th className="px-4 py-2 text-left font-medium">
                    Дія (подія)
                  </th>
                  <th className="py-2 text-left font-medium">Категорія</th>
                  <th className="py-2 text-left font-medium">XP</th>
                  <th className="py-2 text-left font-medium">Ліміт на день</th>
                  <th className="py-2 pr-4 text-left font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {rules
                  .filter(
                    ({ key }) =>
                      category === "all" || ruleCategory(key).id === category,
                  )
                  .map((rule) => {
                    const meta = ruleCategory(rule.key);
                    const source = byKey.get(rule.key);
                    return (
                      <tr
                        key={rule.key}
                        className="border-t border-white/[0.05]"
                      >
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              "block",
                              !rule.enabled && "text-slate-500",
                            )}
                          >
                            {ruleLabel(rule.key)}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {source?.eventName}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-xs",
                              CATEGORY_TONE[meta.id] ?? CATEGORY_TONE.other,
                            )}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <input
                            type="number"
                            aria-label={`XP: ${ruleLabel(rule.key)}`}
                            className={cn(field, "h-9 w-24")}
                            value={rule.points}
                            onChange={(event) =>
                              update(rule.key, {
                                points: Number(event.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <input
                            type="number"
                            min={1}
                            aria-label={`Ліміт на день: ${ruleLabel(rule.key)}`}
                            placeholder="—"
                            className={cn(field, "h-9 w-28")}
                            value={rule.dailyLimit ?? ""}
                            onChange={(event) =>
                              update(rule.key, {
                                dailyLimit:
                                  event.target.value === ""
                                    ? null
                                    : Number(event.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="py-2.5 pr-4">
                          <Toggle
                            label={rule.enabled ? "Увімкнено" : "Вимкнено"}
                            checked={rule.enabled}
                            onChange={(enabled) =>
                              update(rule.key, { enabled })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card
          title="Рівні та прогрес"
          icon={
            <Layers className="size-5 text-violet-300" aria-hidden="true" />
          }
          className="max-w-2xl"
        >
          <p className="-mt-1 mb-3 text-xs text-slate-400">
            Скільки досвіду потрібно для кожного рівня. Пороги мають строго
            зростати.
          </p>
          <ul className="divide-y divide-white/[0.05]">
            {levels.map((item, index) => (
              <li key={item.level} className="flex items-center gap-4 py-2">
                <span className="w-16 text-sm font-semibold">
                  Lv. {item.level}
                </span>
                <input
                  type="number"
                  min={1}
                  aria-label={`Поріг рівня ${item.level}`}
                  className={cn(field, "h-9 w-40")}
                  value={item.threshold}
                  onChange={(event) =>
                    setLevels((list) =>
                      list.map((entry, i) =>
                        i === index
                          ? { ...entry, threshold: Number(event.target.value) }
                          : entry,
                      ),
                    )
                  }
                />
                <span className="text-xs text-slate-500">XP</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
