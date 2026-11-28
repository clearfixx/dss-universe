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
import { DesignScope } from "@/components/ui/design-scope";
import { Checkbox, NativeSelect } from "@/components/ui/choice-fields";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState, EmptyStateDescription } from "@/components/ui/feedback";
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
  WEEK: "За тиждень",
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
                  <AvatarBadge className="bg-success" />
                ) : null}
              </Avatar>
              <div>
                <p className="font-medium text-foreground">
                  {member.displayName || member.username}
                </p>
                <p className="text-xs text-muted-foreground">@{member.username}</p>
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
            <span className="text-success">● Онлайн</span>
          ) : (
            <span className="text-muted-foreground">Офлайн</span>
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
    <DesignScope className="mx-auto max-w-[1500px] min-w-0 space-y-6">
      <header>
        <Badge variant="info">Community</Badge>
        <h1 className="mt-3 font-heading text-3xl font-semibold">Учасники спільноти</h1>
        <p className="mt-2 text-muted-foreground">
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

      <Card className="bg-card">
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-[minmax(12rem,1fr)_auto_auto_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                aria-label="Пошук користувачів"
                defaultValue={filters.search}
                placeholder="Пошук користувачів…"
                className="pl-9"
              />
            </div>
            <Input
              name="role"
              aria-label="Роль"
              defaultValue={filters.role}
              placeholder="Роль"
              className="lg:w-36"
            />
            <NativeSelect
              name="sort"
              aria-label="Сортування учасників"
              defaultValue={filters.sort || "NEWEST"}
              className="h-9 w-full"
            >
              <option value="NEWEST">Нові користувачі</option>
              <option value="OLDEST">Найдавніші</option>
              <option value="LAST_ACTIVE">За активністю</option>
              <option value="USERNAME_ASC">Ім’я А–Я</option>
              <option value="USERNAME_DESC">Ім’я Я–А</option>
            </NativeSelect>
            <label className="flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm text-foreground">
              <Checkbox
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
              <Trophy className="size-5 text-warning" />
              Лідери спільноти
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Рейтинг формується лише з Community Points.
            </p>
          </div>
          <div className="flex flex-wrap rounded-lg border border-border bg-muted p-1">
            {(["MONTH", "YEAR", "ALL_TIME"] as const).map((period) => (
              <Button
                key={period}
                asChild
                size="sm"
                variant={
                  data.leaderboard.period === period ? "secondary" : "ghost"
                }
              >
                <Link href={rankingHref(filters, period)} aria-current={data.leaderboard.period === period ? "true" : undefined}>
                  {rankingLabels[period]}
                </Link>
              </Button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {data.leaderboard.items.map((member) => (
            <Link key={member.userId} href={`/profile/${member.username}`}>
              <Card className="relative h-full overflow-hidden bg-card transition-colors hover:border-ring">
                <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg bg-warning/10 font-bold text-warning">
                  {member.rank === 1 ? (
                    <Crown className="size-4" />
                  ) : (
                    member.rank
                  )}
                </span>
                <CardContent className="flex min-w-0 items-center gap-3 py-4 pr-12">
                  <Avatar className="size-12">
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
                      className="truncate text-sm text-link"
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
                    <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-warning">
                      <Sparkles className="size-3.5" />
                      {member.communityPoints.toLocaleString("uk-UA")} очок
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-card px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="size-4 text-success" />
            Ваша позиція:{" "}
            <strong className="text-foreground">
              {data.leaderboard.viewerRank
                ? `#${data.leaderboard.viewerRank}`
                : "—"}
            </strong>
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <Medal className="size-4 text-link" />
            {(data.leaderboard.viewerCommunityPoints ?? 0).toLocaleString(
              "uk-UA",
            )}{" "}
            Community Points
          </span>
        </div>
      </section>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Усі учасники</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <Table aria-label="Усі учасники" className="min-w-[600px] text-left">
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header) => (
                    <TableHead key={header.id}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.members.items.length === 0 ? (
            <EmptyState className="mt-4"><EmptyStateDescription>Користувачів за цими параметрами не знайдено.</EmptyStateDescription></EmptyState>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <span className="text-xs text-muted-foreground">
              Сторінка {data.members.page} з{" "}
              {Math.max(1, data.members.totalPages)}
            </span>
            <div className="flex gap-2">
              {data.members.page <= 1 ? (
                <Button size="sm" variant="outline" disabled><ChevronLeft /> Назад</Button>
              ) : (
                <Button asChild size="sm" variant="outline"><Link href={pageHref(filters, data.members.page - 1)}><ChevronLeft /> Назад</Link></Button>
              )}
              {data.members.page >= data.members.totalPages ? (
                <Button size="sm" variant="outline" disabled>Далі <ChevronRight /></Button>
              ) : (
                <Button asChild size="sm" variant="outline"><Link href={pageHref(filters, data.members.page + 1)}>Далі <ChevronRight /></Link></Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </DesignScope>
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
    <Card className="bg-card">
      <CardContent className="flex items-center gap-4 py-3">
        <span className="grid size-10 place-items-center rounded-card bg-secondary text-link">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
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
