/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Frontend
 * 📄 File: apps/web/src/app/profile/[username]/page.tsx
 *
 * 🎯 Purpose:
 * Composes the privacy-aware public user profile route.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { Metadata } from "next";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { DesignScope } from "@/components/ui/design-scope";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/feedback";
import { loadPublicProfile } from "@/features/profile/profile-data";
import { ProfileView } from "@/features/profile/profile-view";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `${username} · DSS Universe`,
    description: `Профіль ${username} у DSS Universe`,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const data = await loadPublicProfile(username).catch(() => null);

  if (!data) {
    return (
      <DssApplicationShell>
        <DesignScope className="mx-auto max-w-6xl"><Alert variant="warning" role="alert"><AlertTitle>Профіль недоступний</AlertTitle><AlertDescription>Перевірте ім’я користувача або налаштування приватності профілю.</AlertDescription></Alert></DesignScope>
      </DssApplicationShell>
    );
  }

  return (
    <DssApplicationShell pageTitle={{ pathname: `/profile/${encodeURIComponent(username)}`, title: data.profile.displayName?.trim() || data.profile.username }}>
      <ProfileView {...data} />
    </DssApplicationShell>
  );
}

/**
 * Dynamic params are awaited. Even usernames respect the speed of light.
 */
