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

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ViewerActivityFeedQuery } from "@/gql/graphql";
import { ActivityVisitMarker } from "@/features/activity/activity-visit-marker";

import { GraphqlPlatformStatus } from "./graphql-platform-status";

type ActivityFeed = ViewerActivityFeedQuery["viewerActivityFeed"];

export function CommandDeckOverview({ feed }: { feed?: ActivityFeed | null }) {
  const activity = (feed?.items ?? []).map((item) => ({
    icon: item.module === "PROFILE" ? MessageSquare : BookOpen,
    title: activityTitle(item.action),
    text: `${item.module} · ${item.subjectType}`,
    time: relativeTime(item.occurredAt),
    unread: item.isUnread,
    id: item.id,
  }));

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {feed ? <ActivityVisitMarker /> : null}
      <div>
        <Badge className="mb-3 bg-violet-500/15 text-violet-200">
          Command Deck · Адміністрування
        </Badge>
        <h1 className="text-3xl font-bold">Панель адміністратора</h1>
        <p className="mt-2 text-slate-400">
          Огляд доступних подій платформи.
        </p>
        <p className="mt-2 text-xs">
          <GraphqlPlatformStatus />
        </p>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="border-white/10 bg-white/[0.035]">
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
              <p className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                {feed
                  ? "No new universe activity matches this view yet."
                  : "Universe activity is currently unavailable. Please check back later."}
              </p>
            ) : null}
            {activity.map(({ icon: Icon, title, text, time, unread, id }) => (
              <div
                key={id}
                className={`flex items-center gap-4 rounded-xl border p-4 ${unread ? "border-blue-400/30 bg-blue-500/[0.07]" : "border-white/10 bg-white/[0.025]"}`}
              >
                <Icon className="size-5 text-violet-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="truncate text-sm text-slate-400">{text}</p>
                </div>
                <span className="text-xs text-slate-500">{time}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-violet-400/20 bg-gradient-to-b from-violet-950/50 to-white/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-violet-300" /> AI Core briefing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-7 text-slate-300">
              {feed
                ? `${feed.total} relevant signals are available. ${feed.unreadCount} arrived since your previous visit.`
                : "A briefing cannot be prepared while the activity feed is unavailable."}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function activityTitle(action: string) {
  return action
    .split(/[._-]/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function relativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
