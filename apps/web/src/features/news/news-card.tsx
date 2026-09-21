import { Bookmark, Eye, MessageCircle, Star, ThumbsUp } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { NewsCatalogQuery } from "@/gql/graphql";

export type NewsCardItem = NewsCatalogQuery["news"]["items"][number];

const dateFormatter = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function NewsCard({ item }: { item: NewsCardItem }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/65 transition hover:-translate-y-1 hover:border-cyan-400/35 hover:shadow-2xl hover:shadow-cyan-950/30">
      <Link
        href={`/news/${item.language}/${item.slug}`}
        className="relative block aspect-[16/9] overflow-hidden bg-[radial-gradient(circle_at_60%_35%,rgba(34,211,238,.32),transparent_20%),radial-gradient(circle_at_35%_65%,rgba(124,58,237,.35),transparent_26%),linear-gradient(145deg,#09152c,#050713)]"
      >
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle,rgba(255,255,255,.9)_0_1px,transparent_1px)] [background-size:31px_31px]" />
        <div className="absolute inset-x-5 bottom-5 flex items-center justify-between">
          <Badge variant="secondary">{item.postType}</Badge>
          {item.featured ? (
            <Badge className="gap-1 bg-amber-400 text-slate-950">
              <Star className="size-3 fill-current" /> Featured
            </Badge>
          ) : null}
        </div>
        <span className="sr-only">Відкрити новину «{item.title}»</span>
      </Link>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          {item.primaryCategory ? (
            <Link
              href={`/news?category=${item.primaryCategory.slug}`}
              className="text-cyan-300 hover:text-cyan-200"
            >
              {item.primaryCategory.name}
            </Link>
          ) : null}
          <span>·</span>
          <time dateTime={String(item.displayPublishedAt)}>
            {dateFormatter.format(new Date(String(item.displayPublishedAt)))}
          </time>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-white">
            <Link
              href={`/news/${item.language}/${item.slug}`}
              className="transition group-hover:text-cyan-200"
            >
              {item.title}
            </Link>
          </h2>
          <p className="line-clamp-3 leading-6 text-slate-400">
            {item.shortText}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-white/8 pt-4 text-xs text-slate-400">
          <Link
            href={`/profile/${item.author.username}`}
            className="hover:text-white"
          >
            {item.author.displayName ?? item.author.username}
          </Link>
          <div
            className="flex items-center gap-3"
            aria-label="Активність новини"
          >
            <span className="flex items-center gap-1">
              <Eye className="size-3.5" />
              {item.engagement.viewCount ?? "—"}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="size-3.5" />
              {item.engagement.commentCount}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="size-3.5" />
              {item.engagement.score}
            </span>
            {item.engagement.bookmarkedByViewer ? (
              <Bookmark className="size-3.5 fill-cyan-300 text-cyan-300" />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
