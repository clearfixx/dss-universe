/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Activity
 * 📄 File: apps/web/src/features/activity/activity-presenters.ts
 *
 * 🎯 Purpose:
 * Turns an activity feed item into a readable card title and an optional
 * link (P1 A13). Modules contribute presenters for their own events; the
 * feed UI calls presentActivity() and stays module-agnostic.
 *
 * ⚠️ Important:
 * Pure and shared by server and client. Unknown events fall back to the
 * readable action name, as before. Coordinated with the App Shell owner
 * (AGENT-CHAT, 2026-11-26): only the call site lives in the Shell.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { forumActivityPresenter } from "@/features/forum/forum-activity";

export type ActivityItemRef = Readonly<{
  module: string;
  action: string;
  subjectType: string;
  subjectId: string;
}>;

export type ActivityPresentation = Readonly<{
  title: string;
  href: string | null;
}>;

/** Returns null for events the module does not own. */
export type ActivityPresenter = (
  item: ActivityItemRef,
) => ActivityPresentation | null;

const PRESENTERS: readonly ActivityPresenter[] = [forumActivityPresenter];

/** "forum.topic.created.v1" → "Forum Topic Created" (previous behaviour). */
export function fallbackActivityTitle(action: string): string {
  return action
    .replace(/\.v\d+$/, "")
    .split(/[._-]/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export function presentActivity(item: ActivityItemRef): ActivityPresentation {
  for (const present of PRESENTERS) {
    const result = present(item);
    if (result) return result;
  }
  return { title: fallbackActivityTitle(item.action), href: null };
}
