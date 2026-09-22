import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site.config";
import { loadPublicNewsCatalog } from "@/features/news/news-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "daily", priority: 1 },
    {
      url: new URL("/news", siteConfig.url).toString(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];
  const articles = new Map<
    string,
    { language: string; slug: string; displayPublishedAt: unknown }
  >();
  try {
    let page = 1;
    let totalPages = 1;
    do {
      const result = await loadPublicNewsCatalog({ page, pageSize: 100 });
      totalPages = result.news.totalPages;
      for (const article of [
        ...result.news.pinnedItems,
        ...result.news.items,
      ]) {
        articles.set(article.id, article);
      }
      page += 1;
    } while (page <= totalPages);
  } catch {
    return staticEntries;
  }
  return [
    ...staticEntries,
    ...[...articles.values()].map((article) => ({
      url: new URL(
        `/news/${article.language}/${article.slug}`,
        siteConfig.url,
      ).toString(),
      lastModified: new Date(String(article.displayPublishedAt)),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
