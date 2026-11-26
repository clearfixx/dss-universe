/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-news-discussion.tsx
 *
 * 🎯 Purpose:
 * «Обговорення на форумі» block under a news article (P1 A12, mockup
 * «Інтеграція новин і форуму»): the linked topic with its section and
 * counters, and the link controls for the author or administrators.
 *
 * ⚠️ Important:
 * Server component. A topic the viewer cannot see is simply not returned
 * by the API, so the block stays empty for them. Related-topics suggestions
 * from the mockup have no API and are left out.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ArrowRight, MessagesSquare } from "lucide-react";
import Link from "next/link";

import { loadForumCategories, loadNewsDiscussion } from "./forum-data";
import { forumCount, forumWhen } from "./forum-format";
import { ForumNewsLinkDialog } from "./forum-news-link-dialog";

export async function ForumNewsDiscussion({
  articleId,
  articlePath,
  canLink,
}: {
  articleId: string;
  articlePath: string;
  canLink: boolean;
}) {
  const topic = await loadNewsDiscussion(articleId);
  if (!topic && !canLink) return null;
  const categories = topic ? await loadForumCategories() : [];
  let section: string | null = null;
  for (const category of categories) {
    for (const forum of category.forums) {
      if (forum.id === topic?.forumId) section = forum.title;
      for (const sub of forum.subforums) {
        if (sub.id === topic?.forumId)
          section = `${forum.title} › ${sub.title}`;
      }
    }
  }
  const replies = topic ? Math.max(0, topic.postCount - 1) : 0;

  return (
    <section
      aria-labelledby="news-discussion"
      className="rounded-2xl border border-white/10 bg-slate-950/60 p-5"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <MessagesSquare className="size-5 text-violet-300" aria-hidden="true" />
        <h2 id="news-discussion" className="font-semibold">
          Обговорення на форумі
        </h2>
        {topic ? (
          <span className="rounded-md bg-success/15 px-2 py-0.5 text-xs text-emerald-200">
            Прив’язано
          </span>
        ) : null}
      </div>
      {topic ? (
        <div className="space-y-3">
          <div>
            <Link
              href={`/community/forum/topics/${topic.id}`}
              className="text-lg font-semibold text-violet-200 underline-offset-4 hover:underline"
            >
              {topic.title}
            </Link>
            <p className="mt-1 text-sm text-slate-400">
              {section ? `Форум › ${section} · ` : ""}
              {forumCount(replies)} відп. · {forumCount(topic.viewCount)}{" "}
              перегл. · остання активність {forumWhen(topic.lastPostAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/community/forum/topics/${topic.id}`}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Перейти до обговорення
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            {canLink ? (
              <ForumNewsLinkDialog
                articleId={articleId}
                articlePath={articlePath}
                linked
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-slate-400">
            До цієї новини ще не прив’язано тему форуму.
          </p>
          <ForumNewsLinkDialog
            articleId={articleId}
            articlePath={articlePath}
            linked={false}
          />
        </div>
      )}
    </section>
  );
}
