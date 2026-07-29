/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Members Directory Frontend
 * 📄 File: apps/web/src/app/members/page.tsx
 *
 * 🎯 Purpose:
 * Composes URL-backed member discovery with the Phase 7 GraphQL directory.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { DssApplicationShell } from "@/components/shell/dss-application-shell";
import { ErrorState } from "@/components/states/async-states";
import { MembersDirectory } from "@/features/members/members-directory";
import { loadMembersDirectory } from "@/features/profile/profile-data";
import type { LeaderboardPeriod, MembersDirectorySort } from "@/gql/graphql";

type MembersPageProps = {
  searchParams: Promise<{
    onlineOnly?: string;
    page?: string;
    role?: string;
    search?: string;
    sort?: string;
    ranking?: string;
  }>;
};

const sorts: MembersDirectorySort[] = [
  "NEWEST",
  "OLDEST",
  "LAST_ACTIVE",
  "USERNAME_ASC",
  "USERNAME_DESC",
];
const rankingPeriods: LeaderboardPeriod[] = ["MONTH", "YEAR", "ALL_TIME"];

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const sort = sorts.includes(params.sort as MembersDirectorySort)
    ? (params.sort as MembersDirectorySort)
    : "NEWEST";
  const filters = {
    search: params.search?.trim() || undefined,
    role: params.role?.trim() || undefined,
    sort,
    onlineOnly: params.onlineOnly === "true",
    ranking: rankingPeriods.includes(params.ranking as LeaderboardPeriod)
      ? (params.ranking as LeaderboardPeriod)
      : "ALL_TIME",
  };
  const data = await loadMembersDirectory(
    {
      ...filters,
      page,
      limit: 20,
    },
    filters.ranking,
  ).catch(() => null);

  if (!data) {
    return (
      <DssApplicationShell>
        <ErrorState
          title="Каталог учасників недоступний"
          description="Увійдіть у DSS Universe або повторіть запит пізніше."
        />
      </DssApplicationShell>
    );
  }

  return (
    <DssApplicationShell>
      <MembersDirectory data={data} filters={filters} />
    </DssApplicationShell>
  );
}

/**
 * Search belongs in the URL. Shareable coordinates beat hidden state.
 */
