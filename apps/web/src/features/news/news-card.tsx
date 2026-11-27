import {
  Bookmark,
  Eye,
  MessageCircle,
  Newspaper,
  Pin,
  Star,
  ThumbsUp,
} from "lucide-react";
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
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card transition-colors hover:border-ring">
      <Link
        href={`/news/${item.language}/${item.slug}`}
        className="relative grid aspect-[16/9] place-items-center overflow-hidden border-b border-border bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Newspaper aria-hidden="true" className="size-10 text-muted-foreground" />
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
          <Badge variant="secondary">{item.postType}</Badge>
          {item.pin ? (
            <Badge variant="info">
              <Pin className="size-3" /> Закріплено
            </Badge>
          ) : item.featured ? (
            <Badge variant="warning">
              <Star className="size-3" /> Featured
            </Badge>
          ) : null}
        </div>
        <span className="sr-only">Відкрити новину «{item.title}»</span>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.primaryCategory ? (
            <Link
              href={`/news?category=${item.primaryCategory.slug}`}
              className="text-link hover:text-link"
            >
              {item.primaryCategory.name}
            </Link>
          ) : null}
          {item.primaryCategory ? <span aria-hidden="true">·</span> : null}
          <time dateTime={String(item.displayPublishedAt)}>
            {dateFormatter.format(new Date(String(item.displayPublishedAt)))}
          </time>
        </div>

        <div className="space-y-2">
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            <Link
              href={`/news/${item.language}/${item.slug}`}
              className="transition group-hover:text-link"
            >
              {item.title}
            </Link>
          </h2>
          <p className="line-clamp-3 leading-6 text-muted-foreground">
            {item.shortText}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <Link
            href={`/profile/${item.author.username}`}
            className="min-w-0 break-words hover:text-foreground"
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
              <Bookmark className="size-3.5 fill-current text-link" />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
