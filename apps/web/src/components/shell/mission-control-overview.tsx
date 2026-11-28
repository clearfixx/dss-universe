import { Activity, ArrowUpRight, Bell, BookOpen, MessageSquare } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DesignScope } from "@/components/ui/design-scope";
import { Alert, AlertDescription, EmptyState, EmptyStateTitle, EmptyStateDescription } from "@/components/ui/feedback";
import { presentActivity } from "@/features/activity/activity-presenters";
import { ActivityVisitMarker } from "@/features/activity/activity-visit-marker";
import type { ViewerActivityFeedQuery } from "@/gql/graphql";

import { visibleModules } from "./shell-navigation";

type ActivityFeed = ViewerActivityFeedQuery["viewerActivityFeed"];

export function MissionControlOverview({ feed }: { feed?: ActivityFeed | null }) {
  const modules = visibleModules(true, false);

  return (
    <DesignScope className="mx-auto max-w-[1500px] min-w-0 space-y-6">
      {feed ? <ActivityVisitMarker /> : null}
      <header>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Mission Control</h1>
        <p className="mt-2 text-muted-foreground">Ваш персональний простір у DSS Universe.</p>
      </header>

      <section aria-labelledby="mission-modules">
        <h2 id="mission-modules" className="mb-3 font-heading text-xl font-semibold">Модулі</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="group flex min-w-0 items-center gap-3 rounded-card border border-border bg-card p-4 transition-colors hover:border-ring focus-visible:outline-2 focus-visible:outline-ring">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-link"><Icon className="size-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1 break-words font-medium">{label}</span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-link" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-2">
              Остання активність
              {feed && feed.unreadCount > 0 ? <Badge variant="info">Нових: {feed.unreadCount}</Badge> : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!feed ? (
              <Alert variant="warning"><AlertDescription>Стрічка активності тимчасово недоступна.</AlertDescription></Alert>
            ) : feed.items.length === 0 ? (
              <EmptyState><EmptyStateTitle>Подій поки немає</EmptyStateTitle><EmptyStateDescription>Тут з’являтиметься доступна вам активність спільноти.</EmptyStateDescription></EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {feed.items.map((item) => {
                  const Icon = item.module === "PROFILE" ? MessageSquare : BookOpen;
                  const { title, href } = presentActivity(item);
                  return (
                    <li key={item.id} className="flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <Icon className="mt-1 size-5 shrink-0 text-link" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        {href ? <Link href={href} className="break-words text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring">{title}</Link> : <p className="break-words text-sm font-medium">{title}</p>}
                        <p className="mt-1 break-words text-xs text-muted-foreground">{item.module} · {item.subjectType}</p>
                        <time className="mt-1 block text-xs text-muted-foreground" dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleDateString("uk-UA", { timeZone: "UTC" })}</time>
                      </div>
                      {item.isUnread ? <Badge variant="info">Нове</Badge> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader><CardTitle>Огляд активності</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {feed ? (
              <dl className="space-y-3">
                <div className="flex items-center gap-3 rounded-md bg-muted p-3">
                  <Activity className="size-5 shrink-0 text-link" aria-hidden="true" />
                  <dt className="flex-1 text-sm text-muted-foreground">Доступні події</dt>
                  <dd className="text-xl font-semibold tabular-nums">{feed.total}</dd>
                </div>
                <div className="flex items-center gap-3 rounded-md bg-muted p-3">
                  <Bell className="size-5 shrink-0 text-brand-cyan" aria-hidden="true" />
                  <dt className="flex-1 text-sm text-muted-foreground">Нові події</dt>
                  <dd className="text-xl font-semibold tabular-nums">{feed.unreadCount}</dd>
                </div>
              </dl>
            ) : <p className="text-sm text-muted-foreground">Дані недоступні.</p>}
          </CardContent>
        </Card>
      </section>
    </DesignScope>
  );
}
