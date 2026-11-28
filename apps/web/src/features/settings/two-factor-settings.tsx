"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/feedback";
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
      <div className="space-y-3 rounded-card border border-success/30 p-3">
        <p className="text-sm font-medium text-success">2FA увімкнено</p>
        <p className="text-xs text-muted-foreground">
          Recovery codes залишилось: {recoveryCodesRemaining}. Вимкнення 2FA
          завершить усі активні сесії.
        </p>
        <form action={disableViewerTwoFactor} className="space-y-2">
          <Input
            name="password"
            type="password"
            aria-label="Поточний пароль для 2FA"
            autoComplete="current-password"
            placeholder="Поточний пароль"
            required
          />
          <Input
            name="code"
            autoComplete="one-time-code"
            aria-label="Код 2FA або recovery code"
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
      <div className="space-y-3 rounded-lg border border-warning/30 p-3">
        <p className="text-sm font-medium text-success">2FA увімкнено</p>
        <Alert variant="warning"><AlertTitle>Збережіть коди відновлення</AlertTitle><AlertDescription>Ці одноразові коди більше не показуватимуться після закриття.</AlertDescription></Alert>
        <pre className="whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
          {confirmation.recoveryCodes?.join("\n")}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">Двофакторна автентифікація</p>
      <p className="text-xs text-muted-foreground">
        Використовуйте TOTP-застосунок. Для налаштування доступні секретний ключ та URI.
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
            <code className="block break-all rounded bg-muted p-2">
              {setup.secret}
            </code>
            <details>
              <summary className="cursor-pointer text-muted-foreground">
                Показати otpauth URI
              </summary>
              <code className="mt-1 block break-all rounded bg-muted p-2">
                {setup.otpauthUri}
              </code>
            </details>
          </div>
          <form action={confirm} className="flex flex-wrap gap-2">
            <Input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              aria-label="Шестизначний код 2FA"
              className="min-w-0 flex-1"
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
        <Alert variant="destructive" role="alert"><AlertDescription>{setup.message}</AlertDescription></Alert>
      ) : null}
      {confirmation.status === "error" ? (
        <Alert variant="destructive" role="alert"><AlertDescription>{confirmation.message}</AlertDescription></Alert>
      ) : null}
    </div>
  );
}
