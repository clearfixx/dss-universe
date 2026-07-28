/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Frontend
 * 📄 File: apps/web/src/app/profile/[username]/page.tsx
 *
 * 🎯 Purpose:
 * Composes the authenticated public user profile route.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { Metadata } from "next";

import { DssApplicationShell } from "@/components/shell/dss-application-shell";
import { ErrorState } from "@/components/states/async-states";
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
        <ErrorState
          title="Профіль недоступний"
          description="Увійдіть у DSS Universe або перевірте ім’я користувача."
        />
      </DssApplicationShell>
    );
  }

  return (
    <DssApplicationShell>
      <ProfileView {...data} />
    </DssApplicationShell>
  );
}

/**
 * Dynamic params are awaited. Even usernames respect the speed of light.
 */
