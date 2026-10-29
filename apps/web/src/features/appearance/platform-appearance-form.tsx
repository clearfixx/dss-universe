"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  SHELL_VARIANTS,
  type ShellVariant,
} from "@/components/shell/shell-navigation";

import {
  savePlatformShellVariant,
  type AppearanceActionState,
} from "./appearance-actions";

const initialState: AppearanceActionState = { status: "idle", message: "" };

const variants: Record<ShellVariant, { name: string; description: string }> = {
  MODULE_LAUNCHER: {
    name: "Module Launcher",
    description: "Компактний Navbar з каталогом усіх доступних модулів.",
  },
  HORIZONTAL_NAVIGATION: {
    name: "Horizontal Navigation",
    description: "Глобальні модулі відображаються безпосередньо в Navbar.",
  },
  HYBRID: {
    name: "Hybrid",
    description: "Основні модулі в Navbar та окремий каталог для решти.",
  },
};

export function PlatformAppearanceForm({ activeVariant }: { activeVariant: ShellVariant }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ShellVariant>(activeVariant);
  const [state, action, pending] = useActionState(savePlatformShellVariant, initialState);
  const saved = state.status === "success" && state.savedVariant
    ? (state.savedVariant as ShellVariant)
    : activeVariant;

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [state.status, state.savedVariant, router]);

  return (
    <section className="max-w-4xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Application Shell</h1>
        <p className="text-sm text-muted-foreground">
          Змініть глобальне розміщення навігації. Попередній перегляд не впливає на відвідувачів, поки ви не збережете зміни.
        </p>
      </header>
      <form action={action} className="space-y-5">
        <fieldset className="grid gap-3 md:grid-cols-3" disabled={pending}>
          <legend className="mb-3 text-sm font-medium">Варіант глобальної навігації</legend>
          {SHELL_VARIANTS.map((variant) => (
            <label
              key={variant}
              className={`cursor-pointer rounded-xl border p-4 transition-colors ${selected === variant ? "border-violet-500/50 bg-violet-500/10" : "border-[color:var(--shell-divider)] bg-card hover:bg-muted/50"}`}
            >
              <input
                className="sr-only"
                type="radio"
                name="variant"
                value={variant}
                checked={selected === variant}
                onChange={() => setSelected(variant)}
                required
              />
              <span className="block font-medium">{variants[variant].name}</span>
              <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                {variants[variant].description}
              </span>
            </label>
          ))}
        </fieldset>

        <div className="rounded-xl border border-[color:var(--shell-divider)] bg-card p-4">
          <p className="mb-3 text-sm font-medium">Попередній перегляд: {variants[selected].name}</p>
          <div className="flex items-center gap-2 overflow-hidden rounded-lg bg-[color:var(--shell-surface)] p-3">
            <span className="shrink-0 text-xs font-semibold">DSS</span>
            {selected === "MODULE_LAUNCHER" ? (
              <span className="rounded-md bg-violet-500/15 px-3 py-2 text-xs">Модулі ▾</span>
            ) : (
              <>
                <span className="rounded-md bg-violet-500/15 px-2 py-2 text-xs">Mission Control</span>
                <span className="hidden rounded-md px-2 py-2 text-xs sm:inline">Новини</span>
                {selected === "HORIZONTAL_NAVIGATION" && (
                  <span className="hidden rounded-md px-2 py-2 text-xs md:inline">Учасники</span>
                )}
                <span className="ml-auto rounded-md border border-[color:var(--shell-divider)] px-2 py-2 text-xs">
                  Усі модулі ▾
                </span>
              </>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Це схема навігації, а не повна копія робочої сторінки.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending || selected === saved}>
            {pending ? "Зберігаємо…" : "Застосувати"}
          </Button>
          <Button type="button" variant="outline" disabled={pending || selected === saved} onClick={() => setSelected(saved)}>
            Скасувати перегляд
          </Button>
          <span className="text-xs text-muted-foreground">
            Активний варіант: {variants[saved].name}
          </span>
        </div>
        {state.message && (
          <p role="status" aria-live="polite" className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-400"}>
            {state.message}
          </p>
        )}
      </form>
    </section>
  );
}
