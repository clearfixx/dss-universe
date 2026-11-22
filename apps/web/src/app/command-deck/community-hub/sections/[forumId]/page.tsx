/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/app/command-deck/community-hub/sections/[forumId]/page.tsx
 *
 * 🎯 Purpose:
 * Command Deck › Community Hub › Структура форуму › <section>: access,
 * visibility, moderators, content limits of one forum section.
 *
 * ⚠️ Important:
 * Admin area: 404 unless IAM grants Command Deck access or the section
 * does not exist.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommandDeckFrame } from "@/components/command-deck/command-deck-frame";
import { loadAdminCommandDeckAccess } from "@/features/auth/admin-access";
import {
  loadCategoryModerators,
  loadCommunityHubAdmin,
  loadSectionAccess,
} from "@/features/command-deck/command-deck-data";
import { toForumDraft } from "@/features/command-deck/community-hub-admin-model";
import { SectionSettings } from "@/features/command-deck/section-settings";

type Props = {
  params: Promise<{ forumId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export const metadata: Metadata = { title: "Розділ форуму | Command Deck" };

const TABS = ["basics", "access", "moderators", "content"] as const;

export default async function SectionSettingsPage({
  params,
  searchParams,
}: Props) {
  if (!(await loadAdminCommandDeckAccess())) notFound();
  const [{ forumId }, query] = await Promise.all([params, searchParams]);
  const data = await loadCommunityHubAdmin();
  let found: {
    forum: Parameters<typeof toForumDraft>[0];
    category: string;
    categoryId: string;
  } | null = null;
  for (const category of data.forumCategories) {
    for (const forum of category.forums) {
      if (forum.id === forumId)
        found = { forum, category: category.title, categoryId: category.id };
      for (const sub of forum.subforums) {
        if (sub.id === forumId)
          found = {
            forum: sub,
            category: category.title,
            categoryId: category.id,
          };
      }
    }
  }
  if (!found) notFound();
  const [access, moderators] = await Promise.all([
    loadSectionAccess({ forumId }),
    loadCategoryModerators(found.categoryId),
  ]);
  if (!access) notFound();
  const tab = TABS.find((item) => item === query.tab) ?? "access";

  return (
    <CommandDeckFrame
      breadcrumbs={[
        { href: "/command-deck", label: "Command Deck" },
        { href: "/command-deck/community-hub", label: "Community Hub" },
        { href: "/command-deck/community-hub", label: "Структура форуму" },
        { label: found.forum.title },
      ]}
    >
      <SectionSettings
        key={forumId}
        forum={toForumDraft(found.forum)}
        categoryTitle={found.category}
        access={access}
        moderators={moderators}
        initialTab={tab}
      />
    </CommandDeckFrame>
  );
}
