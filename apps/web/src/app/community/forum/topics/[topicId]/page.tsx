/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/app/community/forum/topics/[topicId]/page.tsx
 *
 * 🎯 Purpose:
 * Forum topic page: header, accepted-answer banner, posts in the
 * owner-approved card layout, pagination, reply form and topic sidebar.
 *
 * ⚠️ Important:
 * Visibility is decided by the API; a missing or hidden topic renders 404 and
 * a merged topic redirects to its target.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  CheckCircle2,
  Eye,
  HelpCircle,
  Lock,
  MessageSquare,
  MessagesSquare,
  Pin,
  Reply,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { loadSessionViewer } from "@/features/auth/session-data";
import {
  FORUM_PAGE_SIZE,
  loadAccountBanRules,
  loadForumCategories,
  loadForumThread,
  loadForumTopicPoll,
  loadForumTopicViewerState,
} from "@/features/forum/forum-data";
import { forumMemberName } from "@/features/forum/forum-format";
import type { ForumReplySort } from "@/gql/graphql";
import { ForumPoll } from "@/features/forum/forum-poll";
import { ForumPostCard } from "@/features/forum/forum-post-card";
import { ForumReplyComposer } from "@/features/forum/forum-reply-composer";
import { ForumReadOnlyNotice } from "@/features/forum/forum-states";
import { ForumTopicModeration } from "@/features/forum/forum-topic-moderation";
import {
  ForumFollowButton,
  ForumTopicVisit,
} from "@/features/forum/forum-topic-controls";

type Props = {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("uk-UA", {
  dateStyle: "medium",
  timeStyle: "short",
});

const topicPath = (id: string) => `/community/forum/topics/${id}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topicId } = await params;
  const thread = await loadForumThread(topicId, 1);
  return {
    title: thread
      ? `${thread.topic.title} | Форум DSS Universe`
      : "Тему не знайдено | DSS Universe",
  };
}

export default async function ForumTopicRoute({ params, searchParams }: Props) {
  const { topicId } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const sort =
    REPLY_SORTS.find((item) => item.id === query.sort)?.id ?? "OLDEST";
  const thread = await loadForumThread(topicId, page, sort);
  if (!thread) notFound();
  const { topic, posts, similar } = thread;
  if (topic.mergedIntoTopicId) redirect(topicPath(topic.mergedIntoTopicId));

  const [viewer, viewerState, poll, categories] = await Promise.all([
    loadSessionViewer(),
    loadForumTopicViewerState(topicId),
    loadForumTopicPoll(topic.interactionTargetId),
    loadForumCategories(),
  ]);
  const forums = categories.flatMap((category) =>
    category.forums.flatMap((forum) => [
      { ...forum, category: category.title },
      ...forum.subforums.map((sub) => ({ ...sub, category: category.title })),
    ]),
  );
  const forum = forums.find((item) => item.id === topic.forumId);

  const path = topicPath(topic.id);
  const pages = Math.max(1, Math.ceil(posts.total / FORUM_PAGE_SIZE));
  const readOnlyUntil = viewerState?.sanctions.readOnlyUntil;
  const abilities = topic.viewerAbilities;
  // Only staff ask; the API answers administrators and refuses the rest.
  const banRules = abilities.moderate ? await loadAccountBanRules() : null;
  const canWrite = abilities.reply && !readOnlyUntil;
  const acceptedHere = posts.items.find(
    (post) => post.id === topic.acceptedAnswerPostId,
  );
  const lastNumber = Math.max(0, ...posts.items.map((post) => post.number));
  const pageHref = (target: number, order: ForumReplySort = sort) => {
    const next = new URLSearchParams();
    if (order !== "OLDEST") next.set("sort", order);
    if (target > 1) next.set("page", String(target));
    const qs = next.toString();
    return qs ? `${path}?${qs}` : path;
  };

  return (
    <DssApplicationShell
      pageTitle={{ pathname: path, title: topic.title }}
      breadcrumbs={[
        { href: "/community", label: "Спільнота" },
        { label: "Форум" },
        ...(forum
          ? [
              { label: forum.category },
              { href: `/community/forum/${forum.id}`, label: forum.title },
            ]
          : []),
        { label: topic.title },
      ]}
    >
      <ForumTopicVisit
        topicId={topic.id}
        readUpTo={lastNumber}
        signedIn={viewer !== null}
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem] 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
            <div className="min-w-0 flex-1 space-y-2.5">
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold leading-tight sm:text-2xl">
                {topic.pinned ? (
                  <Pin
                    className="size-5 text-amber-300"
                    aria-label="Закріплено"
                  />
                ) : null}
                {topic.title}
                {topic.acceptedAnswerPostId ? (
                  <CheckCircle2
                    className="size-6 shrink-0 text-emerald-400"
                    aria-label="Є прийнята відповідь"
                  />
                ) : null}
              </h1>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/20 px-2 py-1 font-medium text-violet-200">
                  {topic.kind === "QUESTION" ? (
                    <HelpCircle className="size-3.5" aria-hidden="true" />
                  ) : (
                    <MessagesSquare className="size-3.5" aria-hidden="true" />
                  )}
                  {topic.kind === "QUESTION" ? "Питання" : "Обговорення"}
                </span>
                {topic.state !== "OPEN" ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-slate-300">
                    <Lock className="size-3" aria-hidden="true" />
                    {topic.state === "ARCHIVED" ? "Архів" : "Закрита"}
                  </span>
                ) : null}
                {topic.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-md bg-white/[0.06] px-2 py-1 text-slate-300"
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                <span className="inline-flex items-center gap-2 text-slate-200">
                  {topic.author?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={topic.author.avatarUrl}
                      alt=""
                      className="size-6 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex size-6 items-center justify-center rounded-full bg-primary/25 text-violet-100 text-[10px] font-bold"
                    >
                      {forumMemberName(topic.author).slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  {forumMemberName(topic.author)}
                </span>
                <span aria-hidden="true">·</span>
                <time dateTime={String(topic.createdAt)}>
                  {dateFormatter.format(new Date(String(topic.createdAt)))}
                </time>
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-4" aria-hidden="true" />
                  {topic.viewCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="size-4" aria-hidden="true" />
                  {Math.max(0, topic.postCount - 1)}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ForumFollowButton
                topicId={topic.id}
                followed={viewerState?.subscribed ?? false}
                signedIn={viewer !== null}
                path={path}
              />
              {canWrite ? (
                <a
                  href="#forum-reply"
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500"
                >
                  <Reply className="size-4" aria-hidden="true" />
                  Відповісти
                </a>
              ) : null}
            </div>
          </header>

          {topic.acceptedAnswerPostId ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm">
              <CheckCircle2
                className="size-5 text-emerald-400"
                aria-hidden="true"
              />
              <strong className="text-emerald-200">Є прийнята відповідь</strong>
              {acceptedHere ? (
                <a
                  href={`#post-${acceptedHere.number}`}
                  className="text-emerald-300 underline underline-offset-4"
                >
                  Перейти до відповіді #{acceptedHere.number} →
                </a>
              ) : null}
            </div>
          ) : null}

          {topic.state === "TRASHED" ? (
            <div
              role="status"
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
            >
              Тема в кошику: учасники її не бачать. Модератори можуть її
              відновити.{" "}
              <Link
                href="/community/moderation/trash"
                className="font-medium text-white underline"
              >
                Відкрити кошик
              </Link>
            </div>
          ) : null}

          {readOnlyUntil ? (
            <ForumReadOnlyNotice until={String(readOnlyUntil)}>
              Читати й стежити за темами можна, писати — ні.
            </ForumReadOnlyNotice>
          ) : null}

          {poll ? (
            <ForumPoll poll={poll} signedIn={viewer !== null} path={path} />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <h2 className="text-base font-semibold">
              {Math.max(0, topic.postCount - 1)}{" "}
              {pluralReplies(Math.max(0, topic.postCount - 1))}
            </h2>
            <nav
              aria-label="Сортування відповідей"
              className="flex max-w-full items-center gap-1 overflow-x-auto text-sm"
            >
              <span className="mr-1 shrink-0 text-slate-400">Сортувати:</span>
              {REPLY_SORTS.map((item) => (
                <Link
                  key={item.id}
                  href={pageHref(1, item.id)}
                  aria-current={item.id === sort ? "true" : undefined}
                  className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 ${
                    item.id === sort
                      ? "bg-white/[0.08] text-white"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-3">
            {posts.items.map((post) => (
              <ForumPostCard
                key={post.id}
                post={post}
                topicAuthorId={topic.author?.id ?? ""}
                curatorId={topic.curatorId ?? null}
                topicId={topic.id}
                abilities={abilities}
                topicState={topic.state}
                topicTitle={topic.title}
                allowsGatedContent={forum?.allowsGatedContent ?? false}
                banRules={banRules}
                accepted={post.id === topic.acceptedAnswerPostId}
                viewerId={viewer?.id ?? null}
                canReply={canWrite}
                path={pageHref(page)}
              />
            ))}
          </div>

          {pages > 1 ? (
            <nav
              aria-label="Сторінки теми"
              className="flex flex-wrap justify-end gap-2"
            >
              {Array.from({ length: pages }, (_, index) => index + 1).map(
                (target) => (
                  <Link
                    key={target}
                    href={pageHref(target)}
                    aria-current={target === page ? "page" : undefined}
                    className={`flex size-9 items-center justify-center rounded-lg border text-sm ${
                      target === page
                        ? "border-violet-500 bg-violet-600 text-white"
                        : "border-white/10 text-slate-300 hover:border-violet-400/50"
                    }`}
                  >
                    {target}
                  </Link>
                ),
              )}
            </nav>
          ) : null}

          {canWrite ? (
            <ForumReplyComposer
              topicId={topic.id}
              path={pageHref(page)}
              lastPage={sort === "OLDEST" ? pageHref(pages) : pageHref(1)}
              allowsGatedContent={forum?.allowsGatedContent ?? false}
            />
          ) : readOnlyUntil && topic.state === "OPEN" ? (
            <div
              aria-disabled="true"
              className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-card px-4 py-3 text-sm text-slate-500"
            >
              <span className="flex-1">
                Написати відповідь… (недоступно в режимі «Лише читання»)
              </span>
              <Lock className="size-4 shrink-0" aria-hidden="true" />
            </div>
          ) : (
            <p className="rounded-xl bg-card px-4 py-3 text-sm text-slate-400">
              {viewer === null ? (
                <>
                  <Link
                    href={`/login?returnTo=${path}`}
                    className="text-violet-300"
                  >
                    Увійдіть
                  </Link>
                  , щоб відповісти.
                </>
              ) : topic.state !== "OPEN" ? (
                "Тема закрита для нових відповідей."
              ) : (
                "Відповідати зараз не можна."
              )}
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <ForumTopicModeration
            topic={topic}
            abilities={abilities}
            forums={forums.map((item) => ({
              id: item.id,
              title: item.title,
              category: item.category,
            }))}
            path={path}
          />
          <section className="rounded-xl bg-card p-4">
            <h2 className="mb-3 font-semibold">Про тему</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-400">Розділ</dt>
              <dd>{forum?.title ?? "—"}</dd>
              <dt className="text-slate-400">Тип</dt>
              <dd>{topic.kind === "QUESTION" ? "Питання" : "Обговорення"}</dd>
              <dt className="text-slate-400">Статус</dt>
              <dd>
                {topic.state === "OPEN"
                  ? "Відкрита"
                  : topic.state === "ARCHIVED"
                    ? "Архів"
                    : "Закрита"}
              </dd>
              <dt className="text-slate-400">Автор</dt>
              <dd>{forumMemberName(topic.author)}</dd>
              <dt className="text-slate-400">Остання активність</dt>
              <dd>
                {dateFormatter.format(new Date(String(topic.lastPostAt)))}
              </dd>
              <dt className="text-slate-400">Відповіді</dt>
              <dd>{Math.max(0, topic.postCount - 1)}</dd>
              <dt className="text-slate-400">Перегляди</dt>
              <dd>{topic.viewCount}</dd>
            </dl>
          </section>
          {similar.length ? (
            <section className="rounded-xl bg-card p-4">
              <h2 className="mb-3 font-semibold">Схожі теми</h2>
              <ul className="space-y-3">
                {similar.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={topicPath(item.id)}
                      className="group flex gap-3"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                        {item.kind === "QUESTION" ? (
                          <HelpCircle className="size-4" aria-hidden="true" />
                        ) : (
                          <MessagesSquare
                            className="size-4"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                      <span className="min-w-0 space-y-1">
                        <span className="line-clamp-2 text-sm text-slate-100 group-hover:text-violet-200">
                          {item.title}
                        </span>
                        <span className="flex gap-3 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare
                              className="size-3.5"
                              aria-hidden="true"
                            />
                            {Math.max(0, item.postCount - 1)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Eye className="size-3.5" aria-hidden="true" />
                            {item.viewCount}
                          </span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </DssApplicationShell>
  );
}

const REPLY_SORTS: ReadonlyArray<{ id: ForumReplySort; label: string }> = [
  { id: "OLDEST", label: "Спочатку старі" },
  { id: "NEWEST", label: "Спочатку нові" },
  { id: "BEST", label: "Найкращі" },
];

function pluralReplies(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "відповідь";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return "відповіді";
  return "відповідей";
}
