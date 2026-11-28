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
import { DesignScope } from "@/components/ui/design-scope";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/feedback";
import { loadProfileSettings } from "@/features/profile/profile-data";
import { loadSessionViewer } from "@/features/auth/session-data";
import { ProfileSettingsView } from "@/features/settings/profile-settings-view";

export default async function ProfileSettingsPage() {
  // Do not request administrative appearance data for guests or invalid
  // sessions. The actual appearance resolver still enforces IAM server-side.
  const viewer = await loadSessionViewer();
  const settings = viewer
    ? await loadProfileSettings().catch(() => null)
    : null;
  const canManageAppearance = settings
    ? await loadAdminShellVariant()
    : null;

  if (!settings) {
    return (
      <DssApplicationShell>
        <DesignScope className="mx-auto max-w-6xl"><Alert variant="warning" role="alert"><AlertTitle>Налаштування недоступні</AlertTitle><AlertDescription>Увійдіть у DSS Universe, щоб керувати профілем.</AlertDescription></Alert></DesignScope>
      </DssApplicationShell>
    );
  }

  return (
    <DssApplicationShell>
      <ProfileSettingsView settings={settings} />
      {canManageAppearance && (
        <DesignScope className="mx-auto mt-6 max-w-6xl"><div className="rounded-card border border-border bg-card p-5">
          <h2 className="font-semibold">Адміністрування зовнішнього вигляду</h2>
          <p className="mt-1 text-sm text-muted-foreground">Глобальні варіанти навігації для всієї платформи.</p>
          <Link href="/settings/platform-appearance" className="mt-3 inline-block text-sm text-link underline-offset-4 hover:underline">Відкрити налаштування Shell</Link>
        </div></DesignScope>
      )}
    </DssApplicationShell>
  );
}

/**
 * Owner settings remain behind the authenticated airlock.
 */
