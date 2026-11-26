/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-activity.ts
 *
 * 🎯 Purpose:
 * Forum cards of the activity feed (P1 A13): «Створив тему», «Відповів на
 * форумі», «Відповідь прийнята», linked to the topic where known.
 *
 * ⚠️ Important:
 * The feed only delivers subjects the viewer may see (Activity asks Forum).
 * Posts have no own route yet, so ForumPost cards carry no link.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  ActivityItemRef,
  ActivityPresentation,
} from "@/features/activity/activity-presenters";

const TITLES: Readonly<Record<string, string>> = {
  "forum.topic.created": "Створив тему",
  "forum.post.created": "Відповів на форумі",
  "forum.answer.credited": "Відповідь прийнята",
  "forum.answer.accepted": "Відповідь прийнята",
};

export function forumActivityPresenter(
  item: ActivityItemRef,
): ActivityPresentation | null {
  const action = item.action.replace(/\.v\d+$/, "");
  const title = TITLES[action];
  if (!title) return null;
  return {
    title,
    href:
      // Only real topic IDs from the payload; never a guessed route.
      item.subjectType === "ForumTopic" &&
      /^[0-9a-f-]{36}$/i.test(item.subjectId)
        ? `/community/forum/topics/${item.subjectId}`
        : null,
  };
}
