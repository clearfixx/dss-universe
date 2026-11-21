"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-poll.tsx
 *
 * 🎯 Purpose:
 * Topic poll: choose and vote once, then see results.
 *
 * ⚠️ Important:
 * Owner rules: no deadline, the vote cannot be changed, polls are anonymous
 * or open. Guests see results only.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BarChart3, Check } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { ForumPollFieldsFragment } from "@/gql/graphql";

import { castForumPollBallot } from "./forum-actions";

export function ForumPoll({
  poll: initial,
  signedIn,
  path,
}: {
  poll: ForumPollFieldsFragment;
  signedIn: boolean;
  path: string;
}) {
  const [poll, setPoll] = useState(initial);
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const showResults = poll.viewerHasVoted || !signedIn;
  const single = poll.maxChoices === 1;

  function toggle(optionId: string) {
    setChosen((current) =>
      single
        ? [optionId]
        : current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : current.length < poll.maxChoices
            ? [...current, optionId]
            : current,
    );
  }

  function vote() {
    setError(null);
    start(async () => {
      const result = await castForumPollBallot(poll.id, chosen, path);
      if (result.ok) setPoll(result.data);
      else setError(result.error.message);
    });
  }

  const options = [...poll.options].sort((a, b) => a.position - b.position);

  return (
    <section
      aria-labelledby={`poll-${poll.id}`}
      className="rounded-xl bg-card p-4"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <BarChart3 className="size-5 text-violet-300" aria-hidden="true" />
        <h2 id={`poll-${poll.id}`} className="font-semibold">
          {poll.question}
        </h2>
        <span className="rounded-md bg-violet-500/20 px-2 py-0.5 text-xs text-violet-200">
          {poll.visibility === "ANONYMOUS" ? "Анонімне опитування" : "Відкрите опитування"}
        </span>
      </div>

      {showResults ? (
        <ul className="space-y-3">
          {options.map((option) => {
            const share = poll.totalBallots
              ? Math.round((option.voteCount / poll.totalBallots) * 100)
              : 0;
            const mine = poll.viewerChoiceIds.includes(option.id);
            return (
              <li key={option.id} className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    {mine ? (
                      <Check
                        className="size-4 text-violet-300"
                        aria-label="Ваш вибір"
                      />
                    ) : null}
                    {option.label}
                  </span>
                  <span className="text-slate-400">
                    {share}% ({option.voteCount})
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div
                    className={`h-2 rounded-full ${mine ? "bg-violet-400" : "bg-violet-600"}`}
                    style={{ width: `${share}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <fieldset className="space-y-2">
          <legend className="sr-only">{poll.question}</legend>
          {options.map((option) => (
            <label
              key={option.id}
              className="flex min-h-9 cursor-pointer items-center gap-3 rounded-md bg-white/[0.04] px-3 text-sm hover:bg-white/[0.07]"
            >
              <input
                type={single ? "radio" : "checkbox"}
                name={`poll-${poll.id}`}
                checked={chosen.includes(option.id)}
                onChange={() => toggle(option.id)}
                className="accent-violet-500"
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-xs text-slate-500">
          {poll.totalBallots} голосів
          {single ? "" : ` · до ${poll.maxChoices} варіантів`} · голос не
          змінюється
        </p>
        {!showResults ? (
          <Button
            type="button"
            className="ml-auto"
            disabled={pending || chosen.length === 0}
            onClick={vote}
          >
            {pending ? "Голосуємо…" : "Проголосувати"}
          </Button>
        ) : null}
        {error ? (
          <p role="alert" className="w-full text-sm text-rose-300">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
