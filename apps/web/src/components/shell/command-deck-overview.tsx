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

import {
  BookOpen,
  CircleCheck,
  Flame,
  MessageSquare,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ViewerActivityFeedQuery } from "@/gql/graphql";
import { ActivityVisitMarker } from "@/features/activity/activity-visit-marker";

import { GraphqlPlatformStatus } from "./graphql-platform-status";

const metrics = [
  { label: "Level", value: "42", hint: "Commander", icon: Trophy },
  { label: "Missions", value: "89", hint: "+7 this week", icon: CircleCheck },
  {
    label: "Community points",
    value: "8,765",
    hint: "+156 this week",
    icon: Users,
  },
  {
    label: "Mission streak",
    value: "23 days",
    hint: "Keep it up",
    icon: Flame,
  },
];

const fallbackActivity = [
  {
    icon: BookOpen,
    title: "New research published",
    text: "Quantum Computing Advances 2026",
    time: "2h ago",
  },
  {
    icon: MessageSquare,
    title: "New Community Hub discussion",
    text: "How should we design AI agents?",
    time: "4h ago",
  },
  {
    icon: CircleCheck,
    title: "Academy course updated",
    text: "Advanced TypeScript Patterns",
    time: "8h ago",
  },
];

type ActivityFeed = ViewerActivityFeedQuery["viewerActivityFeed"];

export function CommandDeckOverview({ feed }: { feed?: ActivityFeed | null }) {
  const activity = feed
    ? feed.items.map((item) => ({
        icon: item.module === "PROFILE" ? MessageSquare : BookOpen,
        title: activityTitle(item.action),
        text: `${item.module} · ${item.subjectType}`,
        time: relativeTime(item.occurredAt),
        unread: item.isUnread,
        id: item.id,
      }))
    : fallbackActivity.map((item) => ({
        ...item,
        unread: false,
        id: item.text,
      }));

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {feed ? <ActivityVisitMarker /> : null}
      <div>
        <Badge className="mb-3 bg-violet-500/15 text-violet-200">
          Command Deck
        </Badge>
        <h1 className="text-3xl font-bold">Welcome back, Commander.</h1>
        <p className="mt-2 text-slate-400">
          Here is what changed across the universe while you were away.
        </p>
        <p className="mt-2 text-xs">
          <GraphqlPlatformStatus />
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, hint, icon: Icon }) => (
          <Card key={label} className="border-white/10 bg-white/[0.035]">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  {label}
                </p>
                <p className="text-2xl font-semibold">{value}</p>
                <p className="text-xs text-emerald-400">{hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

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
            {feed && activity.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                No new universe activity matches this view yet.
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
                : "The deterministic briefing remains available even while optional AI summaries are offline."}
            </p>
            <div className="mt-5 rounded-xl border border-violet-400/20 bg-violet-500/10 p-4 text-sm text-violet-100">
              Ask AI Core to summarize your universe activity.
            </div>
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
