/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/app/command-deck/community-hub/page.tsx
 *
 * 🎯 Purpose:
 * Command Deck › Community Hub › Налаштування. `?forum=<id>` or
 * `?category=<id>` selects the section shown in the edit panel.
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
import {
  loadCategoryModerators,
  loadCommunityHubAdmin,
  loadRankingAdmin,
  loadSectionAccess,
  loadSupermoderators,
} from "@/features/command-deck/command-deck-data";
import { CommunityHubSettings } from "@/features/command-deck/community-hub-settings";

export const metadata: Metadata = {
  title: "Community Hub | Command Deck",
};

type Props = { searchParams: Promise<{ forum?: string; category?: string }> };

export default async function CommunityHubAdminPage({ searchParams }: Props) {
  if (!(await loadAdminCommandDeckAccess())) notFound();
  const query = await searchParams;
  const [data, ranking] = await Promise.all([
    loadCommunityHubAdmin(),
    loadRankingAdmin(),
  ]);
  const forumIds = new Set(
    data.forumCategories.flatMap((category) =>
      category.forums.flatMap((forum) => [
        forum.id,
        ...forum.subforums.map(({ id }) => id),
      ]),
    ),
  );
  const selected =
    query.forum && forumIds.has(query.forum)
      ? ({ kind: "forum", id: query.forum } as const)
      : query.category &&
          data.forumCategories.some(({ id }) => id === query.category)
        ? ({ kind: "category", id: query.category } as const)
        : null;
  const access = selected
    ? await loadSectionAccess(
        selected.kind === "forum"
          ? { forumId: selected.id }
          : { categoryId: selected.id },
      )
    : null;
  // P1 C02: whole-category moderators and the global supermoderator list.
  const [moderators, supermoderators] =
    selected?.kind === "category"
      ? await Promise.all([
          loadCategoryModerators(selected.id),
          loadSupermoderators(),
        ])
      : [[], []];

  return (
    <CommandDeckFrame
      breadcrumbs={[
        { href: "/command-deck", label: "Command Deck" },
        { href: "/command-deck/community-hub", label: "Community Hub" },
        { label: "Налаштування" },
      ]}
    >
      <CommunityHubSettings
        key={selected ? `${selected.kind}:${selected.id}` : "none"}
        data={data}
        selected={selected}
        access={access}
        moderators={moderators.filter(({ forumId }) => forumId === null)}
        supermoderators={supermoderators}
        ranking={ranking}
      />
    </CommandDeckFrame>
  );
}
