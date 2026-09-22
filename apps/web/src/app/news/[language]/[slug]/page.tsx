import { ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DssApplicationShell } from "@/components/shell/dss-application-shell";
import { Badge } from "@/components/ui/badge";
import {
  loadFullNews,
  loadNewsComments,
  loadNewsNavigation,
} from "@/features/news/news-data";
import { NewsComments } from "@/features/news/news-comments";
import { NewsDocument } from "@/features/news/news-document";
import { NewsEngagement } from "@/features/news/news-engagement";
import { NewsAttachments } from "@/features/news/news-attachments";
import { NewsAudience } from "@/features/news/news-audience";
import { siteConfig } from "@/config/site.config";

type Props = { params: Promise<{ language: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { language, slug } = await params;
  const article = await loadFullNews(language, slug);
  if (!article) return { title: "Новину не знайдено | DSS Universe" };
  const canonical = `/news/${article.language}/${article.slug}`;
  return {
    title: `${article.title} | DSS Universe`,
    description: article.shortText,
    robots: { index: article.allowIndexing, follow: article.allowIndexing },
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: article.title,
      description: article.shortText,
      publishedTime: String(article.displayPublishedAt),
      authors: [`/profile/${article.author.username}`],
      tags: article.tags.map((tag) => tag.name),
      locale: article.language,
      siteName: siteConfig.name,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.shortText,
    },
  };
}

const dateFormatter = new Intl.DateTimeFormat("uk-UA", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function FullNewsRoute({ params }: Props) {
  const { language, slug } = await params;
  const article = await loadFullNews(language, slug);
  if (!article) notFound();
  const [navigation, comments] = await Promise.all([
    loadNewsNavigation(article.id),
    article.allowComments ? loadNewsComments(article.id, 1) : null,
  ]);
  const articlePath = `/news/${article.language}/${article.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.shortText,
    datePublished: String(article.displayPublishedAt),
    inLanguage: article.language,
    mainEntityOfPage: new URL(articlePath, siteConfig.url).toString(),
    author: {
      "@type": "Person",
      name: article.author.displayName ?? article.author.username,
      url: new URL(
        `/profile/${article.author.username}`,
        siteConfig.url,
      ).toString(),
    },
    publisher: { "@type": "Organization", name: siteConfig.name },
    keywords: article.tags.map((tag) => tag.name).join(", "),
  };

  return (
    <DssApplicationShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c"),
        }}
      />
      <article className="mx-auto max-w-6xl space-y-8">
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300"
        >
          <ArrowLeft className="size-4" />
          Усі новини
        </Link>
        <header className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{article.postType}</Badge>
            {article.primaryCategory ? (
              <Badge variant="outline">{article.primaryCategory.name}</Badge>
            ) : null}
            {article.featured ? (
              <Badge className="bg-amber-400 text-slate-950">Featured</Badge>
            ) : null}
          </div>
          <h1 className="max-w-5xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            {article.title}
          </h1>
          <p className="max-w-3xl text-xl leading-8 text-slate-400">
            {article.shortText}
          </p>
          <div className="flex flex-wrap items-center gap-4 border-y border-white/10 py-4 text-sm text-slate-400">
            <Link
              href={`/profile/${article.author.username}`}
              className="font-medium text-white hover:text-cyan-300"
            >
              {article.author.displayName ?? article.author.username}
            </Link>
            <time dateTime={String(article.displayPublishedAt)}>
              {dateFormatter.format(
                new Date(String(article.displayPublishedAt)),
              )}
            </time>
            <span className="flex items-center gap-1">
              <MessageCircle className="size-4" />
              {article.engagement.commentCount}
            </span>
          </div>
          <NewsEngagement
            articleId={article.id}
            interactionTargetId={article.interactionTargetId}
            articlePath={articlePath}
            enabled={article.allowRating}
            initial={article.engagement}
          />
        </header>
        <div className="relative aspect-[21/9] overflow-hidden rounded-3xl border border-cyan-400/15 bg-[radial-gradient(circle_at_50%_45%,rgba(34,211,238,.35),transparent_15%),radial-gradient(circle_at_35%_65%,rgba(124,58,237,.32),transparent_30%),linear-gradient(145deg,#09152c,#050713)]">
          <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle,rgba(255,255,255,.9)_0_1px,transparent_1px)] [background-size:37px_37px]" />
        </div>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 sm:p-10">
            <NewsDocument documentJson={article.documentJson} />
          </div>
          <aside className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <h2 className="mb-3 font-semibold">Теги</h2>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Link key={tag.id} href={`/news?tag=${tag.slug}`}>
                    <Badge variant="outline">#{tag.name}</Badge>
                  </Link>
                ))}
              </div>
            </section>
            {article.related.length ? (
              <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <h2 className="mb-4 font-semibold">Пов’язані сигнали</h2>
                <div className="space-y-4">
                  {article.related.map((item) => (
                    <Link
                      key={item.id}
                      href={`/news/${item.language}/${item.slug}`}
                      className="block border-b border-white/8 pb-4 last:border-0 last:pb-0"
                    >
                      <span className="text-xs uppercase tracking-wide text-cyan-400">
                        {item.anchorText}
                      </span>
                      <p className="mt-1 font-medium leading-5 hover:text-cyan-200">
                        {item.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
        <NewsAttachments items={article.attachments} />
        <NewsAudience
          interactionTargetId={article.interactionTargetId}
          title={article.title}
          initialViewCount={article.engagement.viewCount ?? 0}
          initialSharing={article.sharing}
          sharingEnabled={article.allowSharing}
        />
        {comments ? (
          <NewsComments
            articleId={article.id}
            interactionTargetId={article.interactionTargetId}
            articlePath={articlePath}
            initial={comments.newsComments}
            mode={comments.newsSettings.commentsPaginationMode}
            threshold={comments.newsSettings.commentsPaginationThreshold}
          />
        ) : null}
        <nav
          aria-label="Сусідні новини"
          className="grid gap-4 border-t border-white/10 pt-8 md:grid-cols-2"
        >
          {navigation.previous ? (
            <Link
              href={`/news/${navigation.previous.language}/${navigation.previous.slug}`}
              className="rounded-2xl border border-white/10 p-5 transition hover:border-cyan-400/40"
            >
              <span className="flex items-center gap-2 text-xs text-slate-500">
                <ArrowLeft className="size-3" />
                Попередня новина
              </span>
              <p className="mt-2 font-semibold">{navigation.previous.title}</p>
            </Link>
          ) : (
            <div />
          )}
          {navigation.next ? (
            <Link
              href={`/news/${navigation.next.language}/${navigation.next.slug}`}
              className="rounded-2xl border border-white/10 p-5 text-right transition hover:border-cyan-400/40"
            >
              <span className="flex items-center justify-end gap-2 text-xs text-slate-500">
                Наступна новина
                <ArrowRight className="size-3" />
              </span>
              <p className="mt-2 font-semibold">{navigation.next.title}</p>
            </Link>
          ) : null}
        </nav>
      </article>
    </DssApplicationShell>
  );
}
