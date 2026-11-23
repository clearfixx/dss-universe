"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/community-hub-admin-kit.tsx
 *
 * 🎯 Purpose:
 * Shared building blocks of the Community Hub settings screens: switch,
 * card, tab bar, role matrix editor and draft → API input mapping.
 *
 * ⚠️ Important:
 * Guests can never write or moderate and admins always hold every right;
 * the editor shows those cells locked, the API enforces the same.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Check,
  Crown,
  Minus,
  Shield,
  Star,
  User,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import type { ForumAccessRole, ForumAccessRowInput } from "@/gql/graphql";
import { cn } from "@/lib/utils";

export const ROLES: ReadonlyArray<{
  id: ForumAccessRole;
  label: string;
  icon: typeof User;
}> = [
  { id: "GUEST", label: "Гість", icon: UserRound },
  { id: "MEMBER", label: "Учасник", icon: User },
  { id: "CONTRIBUTOR", label: "Contributor", icon: Star },
  { id: "MODERATOR", label: "Модератор", icon: Shield },
  { id: "ADMIN", label: "Адміністратор", icon: Crown },
];

export type AccessAction =
  | "view"
  | "read"
  | "createTopics"
  | "reply"
  | "editOwn"
  | "deleteOwn"
  | "moderate";

export const ACTIONS: ReadonlyArray<{ id: AccessAction; label: string }> = [
  { id: "view", label: "Бачити розділ" },
  { id: "read", label: "Читати теми" },
  { id: "createTopics", label: "Створювати теми" },
  { id: "reply", label: "Відповідати" },
  { id: "editOwn", label: "Редагувати свої" },
  { id: "deleteOwn", label: "Видаляти свої" },
  { id: "moderate", label: "Модерувати" },
];

export type AccessRow = Omit<ForumAccessRowInput, "__typename">;

/** Same locks as the API: guests read-only, admins everything, read ⇒ view. */
export function lockRow(row: AccessRow): AccessRow {
  if (row.role === "ADMIN") {
    return {
      role: "ADMIN",
      view: true,
      read: true,
      createTopics: true,
      reply: true,
      editOwn: true,
      deleteOwn: true,
      moderate: true,
    };
  }
  const view = row.view;
  const read = view && row.read;
  const writes = read && row.role !== "GUEST";
  return {
    role: row.role,
    view,
    read,
    createTopics: writes && row.createTopics,
    reply: writes && row.reply,
    editOwn: writes && row.editOwn,
    deleteOwn: writes && row.deleteOwn,
    moderate: writes && row.moderate,
  };
}

export function isLocked(role: ForumAccessRole, action: AccessAction) {
  return (
    role === "ADMIN" ||
    (role === "GUEST" && action !== "view" && action !== "read")
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 py-1.5 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition disabled:opacity-40",
          checked ? "bg-violet-600" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white transition-all",
            checked ? "left-[1.125rem]" : "left-0.5",
          )}
        />
      </button>
      <span className="min-w-0 flex-1">
        <span className="block text-slate-100">{label}</span>
        {hint ? (
          <span className="block text-xs text-slate-500">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

export function Card({
  title,
  icon,
  action,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-xl border border-white/[0.07] bg-card",
        className,
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3">
        {icon}
        <h2 className="font-semibold">{title}</h2>
        {action ? <div className="ml-auto">{action}</div> : null}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: ReadonlyArray<{ id: T; label: string; soon?: boolean }>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex overflow-x-auto border-b border-white/[0.07]"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          aria-disabled={tab.soon || undefined}
          title={tab.soon ? "Скоро" : undefined}
          onClick={() => (tab.soon ? undefined : onChange(tab.id))}
          className={cn(
            "relative h-11 shrink-0 px-4 text-sm transition",
            tab.soon
              ? "cursor-default text-slate-500"
              : active === tab.id
                ? "font-semibold text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-violet-500"
                : "text-slate-300 hover:text-white",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function MatrixEditor({
  rows,
  actions = ACTIONS,
  onChange,
}: {
  rows: readonly AccessRow[];
  actions?: ReadonlyArray<{ id: AccessAction; label: string }>;
  onChange: (rows: AccessRow[]) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          "w-full text-sm",
          actions.length > 4 ? "min-w-[34rem]" : "min-w-0",
        )}
      >
        <thead>
          <tr className="text-xs text-slate-400">
            <th className="py-2 pr-3 text-left font-medium">Роль</th>
            {actions.map((action) => (
              <th key={action.id} className="px-1 py-2 text-center font-medium">
                {action.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROLES.map(({ id, label, icon: Icon }) => {
            const row = rows.find((item) => item.role === id)!;
            return (
              <tr key={id} className="border-t border-white/[0.05]">
                <th className="py-2 pr-3 text-left font-normal">
                  <span className="flex items-center gap-2.5">
                    <Icon
                      className="size-4 text-slate-400"
                      aria-hidden="true"
                    />
                    {label}
                  </span>
                </th>
                {actions.map((action) => {
                  const on = row[action.id];
                  const locked = isLocked(id, action.id);
                  return (
                    <td key={action.id} className="px-1 py-1.5 text-center">
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={`${label}: ${action.label}`}
                        disabled={locked}
                        onClick={() =>
                          onChange(
                            rows.map((item) =>
                              item.role === id
                                ? lockRow({ ...item, [action.id]: !on })
                                : item,
                            ),
                          )
                        }
                        className="mx-auto flex size-8 items-center justify-center rounded-md hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        {on ? (
                          <Check
                            className="size-5 text-emerald-400"
                            aria-hidden="true"
                          />
                        ) : (
                          <Minus
                            className="size-4 text-slate-500"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export {
  toForumDraft,
  toForumInput,
  type ForumDraft,
} from "./community-hub-admin-model";

export const ROLE_FLOORS: ReadonlyArray<{
  id: ForumAccessRole;
  label: string;
}> = [
  { id: "GUEST", label: "Усі (гість+)" },
  { id: "MEMBER", label: "Учасник+" },
  { id: "CONTRIBUTOR", label: "Contributor+" },
  { id: "MODERATOR", label: "Модератор+" },
  { id: "ADMIN", label: "Адміністратор" },
];

export const field =
  "h-10 w-full rounded-lg border border-white/[0.09] bg-background px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400";
