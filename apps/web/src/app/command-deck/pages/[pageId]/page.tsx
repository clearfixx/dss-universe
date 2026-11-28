/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/app/command-deck/pages/[pageId]/page.tsx
 *
 * 🎯 Purpose:
 * Command Deck › Статичні сторінки › редагування.
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
import { loadStaticPage } from "@/features/command-deck/command-deck-data";
import { StaticPageEditor } from "@/features/static-pages/static-page-editor";

export const metadata: Metadata = {
  title: "Редагування сторінки | Command Deck",
};

type Props = { params: Promise<{ pageId: string }> };

export default async function EditStaticPage({ params }: Props) {
  if (!(await loadAdminCommandDeckAccess())) notFound();
  const page = await loadStaticPage((await params).pageId);
  if (!page) notFound();

  return (
    <CommandDeckFrame
      breadcrumbs={[
        { href: "/command-deck", label: "Command Deck" },
        { href: "/command-deck/pages", label: "Статичні сторінки" },
        { label: page.title },
      ]}
    >
      <StaticPageEditor key={page.id} page={page} />
    </CommandDeckFrame>
  );
}
