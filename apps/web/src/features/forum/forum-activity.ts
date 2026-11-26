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
 * ForumPost cards link to the post permalink, which resolves the topic and
 * page through the API (and 404s for hidden posts).
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
  return { title, href: hrefFor(item) };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only real IDs from the payload; never a guessed route. */
function hrefFor(item: ActivityItemRef): string | null {
  if (!UUID.test(item.subjectId)) return null;
  if (item.subjectType === "ForumTopic")
    return `/community/forum/topics/${item.subjectId}`;
  if (item.subjectType === "ForumPost")
    return `/community/forum/posts/${item.subjectId}`;
  return null;
}
