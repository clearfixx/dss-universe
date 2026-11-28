/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/app/command-deck/pages/new/page.tsx
 *
 * 🎯 Purpose:
 * Command Deck › Статичні сторінки › Нова сторінка.
 *
 * ⚠️ Important:
 * Admin area: 404 unless IAM grants Command Deck access; the API also
 * requires cms.pages.manage.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommandDeckFrame } from "@/components/command-deck/command-deck-frame";
import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";
import { StaticPageEditor } from "@/features/static-pages/static-page-editor";

export const metadata: Metadata = { title: "Нова сторінка | Command Deck" };

export default async function NewStaticPage() {
  if (!(await loadAdminCommandDeckAccess())) notFound();

  return (
    <CommandDeckFrame
      breadcrumbs={[
        { href: "/command-deck", label: "Command Deck" },
        { href: "/command-deck/pages", label: "Статичні сторінки" },
        { label: "Нова сторінка" },
      ]}
    >
      <StaticPageEditor page={null} />
    </CommandDeckFrame>
  );
}
