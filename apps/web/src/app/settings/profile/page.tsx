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

import { DssApplicationShell } from "@/components/shell/dss-application-shell";
import { ErrorState } from "@/components/states/async-states";
import { loadProfileSettings } from "@/features/profile/profile-data";
import { ProfileSettingsView } from "@/features/settings/profile-settings-view";

export default async function ProfileSettingsPage() {
  const settings = await loadProfileSettings().catch(() => null);

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
    </DssApplicationShell>
  );
}

/**
 * Owner settings remain behind the authenticated airlock.
 */
