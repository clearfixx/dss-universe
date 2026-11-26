/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/app/command-deck/gamification/xp-rules/page.tsx
 *
 * 🎯 Purpose:
 * Command Deck › Gamification › Правила XP — the one place where XP rules
 * (forum rows included) are configured (P1 C06).
 *
 * ⚠️ Important:
 * Admin area: 404 unless IAM grants Command Deck access.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommandDeckFrame } from "@/components/command-deck/command-deck-frame";
import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";
import { loadXpRules } from "@/features/command-deck/gamification-data";
import { XpRulesSettings } from "@/features/command-deck/xp-rules-settings";

export const metadata: Metadata = { title: "Правила XP | Command Deck" };

export default async function XpRulesPage() {
  if (!(await loadAdminCommandDeckAccess())) notFound();
  const data = await loadXpRules();
  return (
    <CommandDeckFrame
      breadcrumbs={[
        { href: "/command-deck", label: "Command Deck" },
        { href: "/command-deck/gamification/xp-rules", label: "Gamification" },
        { label: "Правила XP" },
      ]}
    >
      <XpRulesSettings data={data} />
    </CommandDeckFrame>
  );
}
