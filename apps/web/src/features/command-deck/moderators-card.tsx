"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/moderators-card.tsx
 *
 * 🎯 Purpose:
 * Moderator assignments of one section or of a whole category (P1 C02):
 * list, member lookup, assign and revoke.
 *
 * ⚠️ Important:
 * The API checks forum.moderators.assign and audits every change. Only
 * assignments of this scope can be revoked here; inherited ones are shown.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Plus, Users, X } from "lucide-react";
import { useState, useTransition } from "react";

import {
  assignForumCategoryModerator,
  assignForumModerator,
  lookupMembers,
  revokeForumModerator,
} from "./command-deck-actions";
import type { AdminModerator } from "./command-deck-data";
import { Card, field } from "./community-hub-admin-kit";

export function ModeratorsCard({
  categoryId,
  forumId,
  parentId,
  moderators,
  onChanged,
  title = "Модератори розділу",
}: {
  categoryId: string;
  /** null: whole-category moderators. */
  forumId: string | null;
  parentId: string | null;
  title?: string;
  moderators: readonly AdminModerator[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [term, setTerm] = useState("");
  const [found, setFound] = useState<
    ReadonlyArray<{ id: string; username: string; displayName: string | null }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const relevant = moderators.filter(
    (item) =>
      item.forumId === null ||
      item.forumId === forumId ||
      item.forumId === parentId,
  );

  return (
    <Card
      title={title}
      icon={<Users className="size-5 text-violet-300" aria-hidden="true" />}
      action={
        <button
          type="button"
          onClick={() => setAdding(!adding)}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600/30 px-2.5 text-xs font-semibold text-violet-100 hover:bg-violet-600/50"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Призначити
        </button>
      }
    >
      {adding ? (
        <div className="mb-3 space-y-2">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              start(async () => {
                const result = await lookupMembers(term);
                setFound(result.ok ? result.data : []);
                setError(result.ok ? null : result.error.message);
              });
            }}
          >
            <input
              aria-label="Пошук учасника"
              placeholder="Ім'я або @username"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              className={field}
            />
            <button
              type="submit"
              className="h-10 rounded-lg border border-white/15 px-3 text-sm"
            >
              Знайти
            </button>
          </form>
          <ul className="space-y-1">
            {found.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const result = forumId
                        ? await assignForumModerator(
                            categoryId,
                            forumId,
                            member.id,
                          )
                        : await assignForumCategoryModerator(
                            categoryId,
                            member.id,
                          );
                      if (!result.ok) return setError(result.error.message);
                      setAdding(false);
                      setFound([]);
                      setTerm("");
                      onChanged();
                    })
                  }
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/[0.05]"
                >
                  <span>
                    {member.displayName || member.username}{" "}
                    <span className="text-xs text-slate-500">
                      @{member.username}
                    </span>
                  </span>
                  <span className="text-xs text-violet-300">Призначити</span>
                </button>
              </li>
            ))}
          </ul>
          {error ? (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
      {relevant.length === 0 ? (
        <p className="text-sm text-slate-400">Модераторів ще не призначено.</p>
      ) : (
        <ul className="space-y-1">
          {relevant.map((item) => {
            const name =
              item.moderator?.displayName ||
              item.moderator?.username ||
              "Учасник";
            return (
              <li key={item.id} className="flex items-center gap-3 py-1.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/25 text-violet-100 text-xs font-bold">
                  {name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {name}
                </span>
                <span className="rounded-md bg-violet-600/25 px-2 py-0.5 text-xs text-violet-100">
                  {item.forumId === null
                    ? "Модератор категорії"
                    : item.forumId === forumId
                      ? "Модератор"
                      : "Модератор форуму-батька"}
                </span>
                {item.forumId === forumId ? (
                  <button
                    type="button"
                    aria-label={`Зняти ${name}`}
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const result = await revokeForumModerator(item.id);
                        if (!result.ok) return setError(result.error.message);
                        onChanged();
                      })
                    }
                    className="rounded-md p-1 text-slate-400 hover:bg-white/[0.06] hover:text-rose-300"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Супермодератори (глобальне право) модерують усі розділи; їх показано
        окремо на сторінці категорії.
      </p>
    </Card>
  );
}

/** Read-only: holders of global forum moderation (P1 C02). */
export function SupermoderatorsCard({
  members,
}: {
  members: ReadonlyArray<{
    id: string;
    username: string;
    displayName: string | null;
    roles: readonly string[];
  }>;
}) {
  return (
    <Card
      title="Супермодератори"
      icon={<Users className="size-5 text-violet-300" aria-hidden="true" />}
    >
      <p className="-mt-1 mb-3 text-xs text-slate-400">
        Мають глобальне право модерації (ролі «Адміністратор» і «Власник») і
        модерують усі категорії. Змінюється в ролях IAM, не тут.
      </p>
      {members.length === 0 ? (
        <p className="text-sm text-slate-400">Немає.</p>
      ) : (
        <ul className="space-y-1">
          {members.map((member) => {
            const name = member.displayName || member.username;
            return (
              <li key={member.id} className="flex items-center gap-3 py-1.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/25 text-xs font-bold text-violet-100">
                  {name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {name}{" "}
                  <span className="text-xs text-slate-500">
                    @{member.username}
                  </span>
                </span>
                <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs text-slate-300">
                  {member.roles.includes("owner") ? "Власник" : "Адміністратор"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
