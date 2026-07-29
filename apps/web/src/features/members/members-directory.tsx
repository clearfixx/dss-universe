/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Members Directory Frontend
 * 📄 File: apps/web/src/features/members/members-directory.tsx
 *
 * 🎯 Purpose:
 * Renders the Phase 7 member catalog with TanStack Table, online presence and
 * URL-backed server filtering.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use client";

import {
  Activity,
  Bot,
  ChevronLeft,
  ChevronRight,
  Crown,
  Medal,
  Search,
  Sparkles,
  Trophy,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { LeaderboardPeriod, MembersDirectoryQuery } from "@/gql/graphql";

type Member = MembersDirectoryQuery["members"]["items"][number];

type MembersDirectoryProps = {
  data: MembersDirectoryQuery;
  filters: {
    search?: string;
    role?: string;
    sort?: string;
    onlineOnly?: boolean;
    ranking?: LeaderboardPeriod;
  };
};

const column = createColumnHelper<Member>();

function initials(member: {
  displayName: string | null;
  username: string;
}): string {
  return (member.displayName || member.username)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function pageHref(
  filters: MembersDirectoryProps["filters"],
  page: number,
): string {
  const search = new URLSearchParams();
  if (filters.search) search.set("search", filters.search);
  if (filters.role) search.set("role", filters.role);
  if (filters.sort) search.set("sort", filters.sort);
  if (filters.onlineOnly) search.set("onlineOnly", "true");
  if (filters.ranking) search.set("ranking", filters.ranking);
  search.set("page", String(page));
  return `/members?${search.toString()}`;
}

function rankingHref(
  filters: MembersDirectoryProps["filters"],
  ranking: LeaderboardPeriod,
): string {
  const search = new URLSearchParams();
  if (filters.search) search.set("search", filters.search);
  if (filters.role) search.set("role", filters.role);
  if (filters.sort) search.set("sort", filters.sort);
  if (filters.onlineOnly) search.set("onlineOnly", "true");
  search.set("ranking", ranking);
  return `/members?${search.toString()}`;
}

const rankingLabels: Record<LeaderboardPeriod, string> = {
  MONTH: "За місяць",
  YEAR: "За рік",
  ALL_TIME: "За весь час",
};

export function MembersDirectory({ data, filters }: MembersDirectoryProps) {
  const columns = useMemo(
    () => [
      column.accessor("username", {
        header: "Користувач",
        cell: ({ row }) => {
          const member = row.original;
          return (
            <Link
              href={`/profile/${member.username}`}
              className="flex items-center gap-3"
            >
              <Avatar>
                {member.avatarUrl ? (
                  <AvatarImage src={member.avatarUrl} alt={member.username} />
                ) : null}
                <AvatarFallback>{initials(member)}</AvatarFallback>
                {member.isOnline ? (
                  <AvatarBadge className="bg-emerald-400" />
                ) : null}
              </Avatar>
              <div>
                <p className="font-medium text-white">
                  {member.displayName || member.username}
                </p>
                <p className="text-xs text-slate-500">@{member.username}</p>
              </div>
            </Link>
          );
        },
      }),
      column.accessor("roles", {
        header: "Ролі",
        cell: ({ getValue }) => (
          <div className="flex flex-wrap gap-1">
            {getValue().map((role) => (
              <Badge key={role} variant="outline">
                {role}
              </Badge>
            ))}
          </div>
        ),
      }),
      column.accessor("isOnline", {
        header: "Статус",
        cell: ({ getValue }) =>
          getValue() ? (
            <span className="text-emerald-300">● Онлайн</span>
          ) : (
            <span className="text-slate-500">Офлайн</span>
          ),
      }),
      column.accessor("createdAt", {
        header: "У спільноті",
        cell: ({ getValue }) =>
          new Date(getValue()).toLocaleDateString("uk-UA"),
      }),
    ],
    [],
  );
  // TanStack Table intentionally owns its mutable table instance.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data.members.items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header>
        <Badge className="bg-blue-500/15 text-blue-200">Community</Badge>
        <h1 className="mt-3 text-3xl font-bold">Учасники спільноти</h1>
        <p className="mt-2 text-slate-400">
          Досліджуйте DSS Universe та знаходьте однодумців.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={Users}
          label="Усього знайдено"
          value={data.members.total}
        />
        <Metric
          icon={Activity}
          label="Учасники онлайн"
          value={data.presenceSummary.onlineMembers}
        />
        <Metric
          icon={UserRound}
          label="Гості онлайн"
          value={data.presenceSummary.onlineGuests}
        />
        <Metric
          icon={Bot}
          label="Пошукові боти"
          value={data.presenceSummary.onlineCrawlers}
        />
      </section>

      <Card className="bg-white/[0.03]">
        <CardContent>
          <form className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_auto_auto_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                name="search"
                defaultValue={filters.search}
                placeholder="Пошук користувачів…"
                className="pl-9"
              />
            </div>
            <Input
              name="role"
              defaultValue={filters.role}
              placeholder="Роль"
              className="lg:w-36"
            />
            <select
              name="sort"
              defaultValue={filters.sort || "NEWEST"}
              className="h-9 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm"
            >
              <option value="NEWEST">Нові користувачі</option>
              <option value="OLDEST">Найдавніші</option>
              <option value="LAST_ACTIVE">За активністю</option>
              <option value="USERNAME_ASC">Ім’я А–Я</option>
              <option value="USERNAME_DESC">Ім’я Я–А</option>
            </select>
            <label className="flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm text-slate-300">
              <input
                type="checkbox"
                name="onlineOnly"
                value="true"
                defaultChecked={filters.onlineOnly}
              />
              Онлайн
            </label>
            <Button type="submit">Застосувати</Button>
          </form>
        </CardContent>
      </Card>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Trophy className="size-5 text-amber-300" />
              Лідери спільноти
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Рейтинг формується лише з Community Points.
            </p>
          </div>
          <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
            {(["MONTH", "YEAR", "ALL_TIME"] as const).map((period) => (
              <Button
                key={period}
                asChild
                size="sm"
                variant={
                  data.leaderboard.period === period ? "secondary" : "ghost"
                }
              >
                <Link href={rankingHref(filters, period)}>
                  {rankingLabels[period]}
                </Link>
              </Button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {data.leaderboard.items.map((member) => (
            <Link key={member.userId} href={`/profile/${member.username}`}>
              <Card className="relative h-full overflow-hidden bg-gradient-to-br from-white/[0.055] to-violet-950/20 transition hover:-translate-y-0.5 hover:border-violet-400/30">
                <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg bg-amber-400/10 font-bold text-amber-300">
                  {member.rank === 1 ? (
                    <Crown className="size-4" />
                  ) : (
                    member.rank
                  )}
                </span>
                <CardContent className="flex items-center gap-4 py-4">
                  <Avatar className="size-16 ring-2 ring-violet-400/20">
                    {member.avatarUrl ? (
                      <AvatarImage
                        src={member.avatarUrl}
                        alt={member.username}
                      />
                    ) : null}
                    <AvatarFallback>{initials(member)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {member.displayName || member.username}
                    </p>
                    <p
                      className="truncate text-sm text-violet-300"
                      style={
                        member.selectedTitle
                          ? { color: member.selectedTitle.color }
                          : undefined
                      }
                    >
                      {member.selectedTitle
                        ? `${member.selectedTitle.badge} ${member.selectedTitle.name}`
                        : `Рівень ${member.currentLevel}`}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-amber-200">
                      <Sparkles className="size-3.5" />
                      {member.communityPoints.toLocaleString("uk-UA")} очок
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-slate-400">
            <TrendingUp className="size-4 text-emerald-300" />
            Ваша позиція:{" "}
            <strong className="text-white">
              {data.leaderboard.viewerRank
                ? `#${data.leaderboard.viewerRank}`
                : "—"}
            </strong>
          </span>
          <span className="flex items-center gap-2 text-slate-400">
            <Medal className="size-4 text-violet-300" />
            {(data.leaderboard.viewerCommunityPoints ?? 0).toLocaleString(
              "uk-UA",
            )}{" "}
            Community Points
          </span>
        </div>
      </section>

      <Card className="bg-white/[0.025]">
        <CardHeader>
          <CardTitle>Усі учасники</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th key={header.id} className="px-3 py-3 font-medium">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.06] transition hover:bg-white/[0.025]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.members.items.length === 0 ? (
            <p className="py-12 text-center text-slate-500">
              Користувачів за цими параметрами не знайдено.
            </p>
          ) : null}
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-xs text-slate-500">
              Сторінка {data.members.page} з{" "}
              {Math.max(1, data.members.totalPages)}
            </span>
            <div className="flex gap-2">
              <Button
                asChild
                size="sm"
                variant="outline"
                disabled={data.members.page <= 1}
              >
                <Link
                  href={pageHref(filters, Math.max(1, data.members.page - 1))}
                >
                  <ChevronLeft /> Назад
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                disabled={data.members.page >= data.members.totalPages}
              >
                <Link href={pageHref(filters, data.members.page + 1)}>
                  Далі <ChevronRight />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Card className="bg-white/[0.03]">
      <CardContent className="flex items-center gap-4 py-3">
        <span className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-xl font-semibold">
            {value.toLocaleString("uk-UA")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 📊 TanStack owns the table. GraphQL owns the truth.
 */
