"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-topic-controls.tsx
 *
 * 🎯 Purpose:
 * Small interactive controls of a topic page: follow, reply/quote buttons
 * on posts, and the bridge that hands a reply target to the composer.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Bell, BellRing, Link2, Quote, Reply } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import {
  markForumTopicRead,
  recordForumTopicView,
  setForumTopicFollowed,
} from "./forum-actions";

export const FORUM_REPLY_EVENT = "dss:forum-reply";
export type ForumReplyTarget = { number: number; quote: boolean };

export function ForumFollowButton({
  topicId,
  followed,
  signedIn,
  path,
}: {
  topicId: string;
  followed: boolean;
  signedIn: boolean;
  path: string;
}) {
  const [on, setOn] = useState(followed);
  const [pending, start] = useTransition();
  if (!signedIn) return null;
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={on}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await setForumTopicFollowed(topicId, !on, path);
          if (result.ok) setOn(!on);
        })
      }
    >
      {on ? (
        <BellRing className="size-4 text-violet-300" aria-hidden="true" />
      ) : (
        <Bell className="size-4" aria-hidden="true" />
      )}
      {on ? "Ви стежите" : "Стежити"}
    </Button>
  );
}

function target(detail: ForumReplyTarget) {
  window.dispatchEvent(new CustomEvent(FORUM_REPLY_EVENT, { detail }));
  document
    .getElementById("forum-reply")
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function ForumPostActions({
  number,
  permalink,
  canReply,
}: {
  number: number;
  permalink: string;
  canReply: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const action =
    "inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-slate-300 transition hover:border-violet-400/40 hover:text-white";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={action}
        onClick={() => {
          void navigator.clipboard
            ?.writeText(new URL(permalink, window.location.href).toString())
            .then(() => setCopied(true));
        }}
        aria-label={`Скопіювати посилання на допис #${number}`}
      >
        <Link2 className="size-4" aria-hidden="true" />
        {copied ? "Скопійовано" : null}
      </button>
      {canReply ? (
        <span className="ml-auto flex gap-2">
          <button
            type="button"
            className={action}
            onClick={() => target({ number, quote: false })}
          >
            <Reply className="size-4" aria-hidden="true" />
            Відповісти
          </button>
          <button
            type="button"
            className={action}
            onClick={() => target({ number, quote: true })}
          >
            <Quote className="size-4" aria-hidden="true" />
            Цитата
          </button>
        </span>
      ) : null}
    </div>
  );
}

/** Records a unique view and marks the posts on screen as read. */
export function ForumTopicVisit({
  topicId,
  readUpTo,
  signedIn,
}: {
  topicId: string;
  readUpTo: number;
  signedIn: boolean;
}) {
  useEffect(() => {
    if (!signedIn) return;
    void recordForumTopicView(topicId);
    if (readUpTo > 0) void markForumTopicRead(topicId, readUpTo);
  }, [topicId, readUpTo, signedIn]);
  return null;
}
