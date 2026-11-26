/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/app/community/forum/posts/[postId]/page.tsx
 *
 * 🎯 Purpose:
 * Permalink of a forum post. Activity cards know only the post ID; this
 * route asks the API where the post lives and redirects to the right page
 * of its topic, anchored at the post.
 *
 * ⚠️ Important:
 * Visibility is decided by the API: hidden or unknown posts → 404.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { notFound, redirect } from "next/navigation";

import { loadForumPostLocation } from "@/features/forum/forum-data";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = Readonly<{ params: Promise<{ postId: string }> }>;

export default async function ForumPostPermalink({ params }: Props) {
  const { postId } = await params;
  if (!UUID.test(postId)) notFound();
  const location = await loadForumPostLocation(postId);
  if (!location) notFound();
  const page = location.page > 1 ? `?page=${location.page}` : "";
  redirect(
    `/community/forum/topics/${location.topicId}${page}#post-${location.number}`,
  );
}
