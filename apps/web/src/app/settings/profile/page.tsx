import Link from "next/link";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Settings Frontend
 * 📄 File: apps/web/src/app/settings/profile/page.tsx
 *
 * 🎯 Purpose:
 * Composes the owner-only profile settings workspace.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { loadAdminShellVariant } from "@/features/appearance/appearance-data";
import { ErrorState } from "@/components/states/async-states";
import { loadProfileSettings } from "@/features/profile/profile-data";
import { ProfileSettingsView } from "@/features/settings/profile-settings-view";

export default async function ProfileSettingsPage() {
  const [settings, canManageAppearance] = await Promise.all([
    loadProfileSettings().catch(() => null),
    loadAdminShellVariant(),
  ]);

  if (!settings) {
    return (
      <DssApplicationShell>
        <ErrorState
          title="Налаштування недоступні"
          description="Увійдіть у DSS Universe, щоб керувати профілем."
        />
      </DssApplicationShell>
    );
  }

  return (
    <DssApplicationShell>
      <ProfileSettingsView settings={settings} />
      {canManageAppearance && (
        <div className="mt-8 rounded-xl border border-[color:var(--shell-divider)] bg-card p-5">
          <h2 className="font-semibold">Адміністрування зовнішнього вигляду</h2>
          <p className="mt-1 text-sm text-muted-foreground">Глобальні варіанти навігації для всієї платформи.</p>
          <Link href="/settings/platform-appearance" className="mt-3 inline-block text-sm text-violet-300 underline-offset-4 hover:underline">Відкрити налаштування Shell</Link>
        </div>
      )}
    </DssApplicationShell>
  );
}

/**
 * Owner settings remain behind the authenticated airlock.
 */
