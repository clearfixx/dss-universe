/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/app/command-deck/design/ui-kit/page.tsx
 *
 * 🎯 Purpose:
 * Internal DSS UI Kit: a read-only reference of the real shared components.
 *
 * ⚠️ Important:
 * Admin area: 404 unless IAM grants Command Deck access. The showcase never
 * writes platform data.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommandDeckFrame } from "@/components/command-deck/command-deck-frame";
import { DesignUiKit } from "@/components/design/design-ui-kit";
import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";

export const metadata: Metadata = {
  title: "UI Kit | Command Deck",
  robots: { index: false, follow: false },
};

export default async function UiKitPage() {
  if (!(await loadAdminCommandDeckAccess())) notFound();

  return (
    <CommandDeckFrame
      breadcrumbs={[
        { href: "/command-deck", label: "Command Deck" },
        { label: "UI Kit" },
      ]}
    >
      <DesignUiKit />
    </CommandDeckFrame>
  );
}
