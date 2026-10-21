"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  beginViewerTwoFactorSetup,
  confirmViewerTwoFactorSetup,
  disableViewerTwoFactor,
  type TwoFactorActionState,
} from "@/features/profile/profile-actions";

const initialState: TwoFactorActionState = { status: "idle" };

export function TwoFactorSettings({
  enabled,
  recoveryCodesRemaining,
}: {
  enabled: boolean;
  recoveryCodesRemaining: number;
}) {
  const [setup, begin, beginPending] = useActionState(
    beginViewerTwoFactorSetup,
    initialState,
  );
  const [confirmation, confirm, confirmPending] = useActionState(
    confirmViewerTwoFactorSetup,
    initialState,
  );

  if (enabled) {
    return (
      <div className="space-y-3 rounded-lg border border-emerald-400/20 p-3">
        <p className="text-sm font-medium text-emerald-300">2FA увімкнено</p>
        <p className="text-xs text-slate-400">
          Recovery codes залишилось: {recoveryCodesRemaining}. Вимкнення 2FA
          завершить усі активні сесії.
        </p>
        <form action={disableViewerTwoFactor} className="space-y-2">
          <Input
            name="password"
            type="password"
            placeholder="Поточний пароль"
            required
          />
          <Input
            name="code"
            autoComplete="one-time-code"
            placeholder="Код 2FA або recovery code"
            required
          />
          <Button type="submit" variant="destructive">
            Вимкнути 2FA
          </Button>
        </form>
      </div>
    );
  }

  if (confirmation.status === "enabled") {
    return (
      <div className="space-y-3 rounded-lg border border-amber-400/20 p-3">
        <p className="text-sm font-medium text-emerald-300">2FA увімкнено</p>
        <p className="text-xs text-amber-200">
          Збережіть ці одноразові recovery codes зараз. Після закриття вони
          більше не показуватимуться.
        </p>
        <pre className="whitespace-pre-wrap rounded bg-black/30 p-3 text-xs">
          {confirmation.recoveryCodes?.join("\n")}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/10 p-3">
      <p className="text-sm font-medium">Двофакторна автентифікація</p>
      <p className="text-xs text-slate-400">
        Використовуйте будь-який TOTP authenticator. QR-дизайн додамо разом із
        фінальним UI; функціонально вже доступні secret і URI.
      </p>
      {setup.status !== "ready" ? (
        <form action={begin}>
          <Button type="submit" variant="outline" disabled={beginPending}>
            {beginPending ? "Створення…" : "Налаштувати 2FA"}
          </Button>
        </form>
      ) : (
        <>
          <div className="space-y-1 text-xs">
            <p className="font-medium">Secret</p>
            <code className="block break-all rounded bg-black/30 p-2">
              {setup.secret}
            </code>
            <details>
              <summary className="cursor-pointer text-slate-400">
                Показати otpauth URI
              </summary>
              <code className="mt-1 block break-all rounded bg-black/30 p-2">
                {setup.otpauthUri}
              </code>
            </details>
          </div>
          <form action={confirm} className="flex gap-2">
            <Input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              placeholder="123456"
              required
            />
            <Button type="submit" disabled={confirmPending}>
              {confirmPending ? "Перевірка…" : "Підтвердити"}
            </Button>
          </form>
        </>
      )}
      {setup.status === "error" ? (
        <p className="text-xs text-red-300">{setup.message}</p>
      ) : null}
      {confirmation.status === "error" ? (
        <p className="text-xs text-red-300">{confirmation.message}</p>
      ) : null}
    </div>
  );
}
