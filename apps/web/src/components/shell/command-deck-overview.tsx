/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Command Deck
 * 📄 File: apps/web/src/components/shell/command-deck-overview.tsx
 *
 * 🎯 Purpose:
 * Establishes the authenticated dashboard composition and state placeholders.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BookOpen, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DesignScope } from "@/components/ui/design-scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ViewerActivityFeedQuery } from "@/gql/graphql";
import { presentActivity } from "@/features/activity/activity-presenters";
import { ActivityVisitMarker } from "@/features/activity/activity-visit-marker";

import { GraphqlPlatformStatus } from "./graphql-platform-status";

type ActivityFeed = ViewerActivityFeedQuery["viewerActivityFeed"];

export function CommandDeckOverview({ feed }: { feed?: ActivityFeed | null }) {
  const activity = (feed?.items ?? []).map((item) => ({
    icon: item.module === "PROFILE" ? MessageSquare : BookOpen,
    ...presentActivity(item),
    text: `${item.module} · ${item.subjectType}`,
    time: relativeTime(item.occurredAt),
    unread: item.isUnread,
    id: item.id,
  }));

  return (
    <DesignScope>
      <div className="mx-auto max-w-[1500px] space-y-6">
        {feed ? <ActivityVisitMarker /> : null}
        <div>
          <Badge className="mb-3 bg-secondary text-secondary-foreground">
            Command Deck · Адміністрування
          </Badge>
          <h1 className="font-heading text-[length:var(--dss-text-h1)] font-semibold leading-tight">Панель адміністратора</h1>
          <p className="mt-2 text-muted-foreground">Огляд доступних подій платформи.</p>
          <p className="mt-2 text-xs">
            <GraphqlPlatformStatus />
          </p>
        </div>
  
        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent universe activity
                {feed?.unreadCount ? (
                  <Badge className="bg-blue-500/15 text-blue-200">
                    {feed.unreadCount} new
                  </Badge>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activity.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-sm text-slate-400">
                  {feed
                    ? "No new universe activity matches this view yet."
                    : "Universe activity is currently unavailable. Please check back later."}
                </p>
              ) : null}
              {activity.map(({ icon: Icon, title, href, text, time, unread, id }) => (
                <div
                  key={id}
                  className={`flex items-center gap-4 rounded-xl border p-4 ${unread ? "border-blue-400/30 bg-blue-500/[0.07]" : "border-white/10 bg-card"}`}
                >
                  <Icon className="size-5 text-link" />
                  <div className="min-w-0 flex-1">
                    {href ? (
                      <Link href={href} className="text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring">{title}</Link>
                    ) : (
                      <p className="text-sm font-medium">{title}</p>
                    )}
                    <p className="truncate text-sm text-slate-400">{text}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{time}</span>
                </div>
              ))}
            </CardContent>
          </Card>
  
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-violet-300" /> AI Core briefing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-7 text-foreground">
                {feed
                  ? `${feed.total} relevant signals are available. ${feed.unreadCount} arrived since your previous visit.`
                  : "A briefing cannot be prepared while the activity feed is unavailable."}
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </DesignScope>
  );
}

function relativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
