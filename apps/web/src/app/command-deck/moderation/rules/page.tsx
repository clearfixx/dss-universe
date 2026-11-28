/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/app/command-deck/moderation/rules/page.tsx
 *
 * 🎯 Purpose:
 * Command Deck › Модерація › Правила спільноти.
 *
 * ⚠️ Important:
 * Admin area: 404 unless IAM grants Command Deck access; the API also
 * requires moderation.rules.manage.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommandDeckFrame } from "@/components/command-deck/command-deck-frame";
import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";
import { loadCommunityRules } from "@/features/command-deck/command-deck-data";
import { CommunityRulesManager } from "@/features/command-deck/community-rules-manager";
import { ModerationTabs } from "@/features/command-deck/moderation-tabs";

export const metadata: Metadata = {
  title: "Правила спільноти | Command Deck",
};

export default async function CommunityRulesPage() {
  if (!(await loadAdminCommandDeckAccess())) notFound();
  const rules = await loadCommunityRules();

  return (
    <CommandDeckFrame
      breadcrumbs={[
        { href: "/command-deck", label: "Command Deck" },
        { label: "Модерація" },
        { label: "Правила спільноти" },
      ]}
    >
      <ModerationTabs active="rules" />
      <CommunityRulesManager rules={rules} />
    </CommandDeckFrame>
  );
}
