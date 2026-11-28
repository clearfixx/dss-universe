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
import type { EditorNode } from "@dss/editor";
import { Bell, BellRing } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import {
  markForumTopicRead,
  recordForumTopicView,
  setForumSectionFollowed,
  setForumTopicFollowed,
} from "./forum-actions";

export const FORUM_REPLY_EVENT = "dss:forum-reply";
export type ForumReplyTarget = {
  number: number;
  quote: boolean;
  /** What the editor receives: the nickname or the quoted post. */
  block: EditorNode | null;
};

/** Follow a topic (new replies) or, with `forumId`, a section (new topics). */
export function ForumFollowButton({
  topicId,
  forumId,
  followed,
  signedIn,
  path,
}: {
  topicId?: string;
  forumId?: string;
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
          const result = forumId
            ? await setForumSectionFollowed(forumId, !on, path)
            : await setForumTopicFollowed(topicId ?? "", !on, path);
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

export function targetForumReply(detail: ForumReplyTarget) {
  window.dispatchEvent(new CustomEvent(FORUM_REPLY_EVENT, { detail }));
  document
    .getElementById("forum-reply")
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
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
