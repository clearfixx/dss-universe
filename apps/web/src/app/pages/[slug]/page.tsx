/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Static Pages
 * 📄 File: apps/web/src/app/pages/[slug]/page.tsx
 *
 * 🎯 Purpose:
 * Public page of a published static page.
 *
 * ⚠️ Important:
 * Drafts and unknown addresses are a real 404: no loading.tsx above this
 * route, so the status is not streamed as 200.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { siteConfig } from "@/config/site.config";
import { loadPublishedStaticPage } from "@/features/static-pages/static-page-data";
import { StaticPageDocument } from "@/features/static-pages/static-page-document";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await loadPublishedStaticPage((await params).slug);
  if (!page) return { title: "Сторінку не знайдено | DSS Universe" };
  const url = new URL(`/pages/${page.slug}`, siteConfig.url).toString();
  const description = page.description || undefined;
  return {
    title: `${page.title} | DSS Universe`,
    description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description, url, type: "article" },
  };
}

export default async function PublishedStaticPage({ params }: Props) {
  const page = await loadPublishedStaticPage((await params).slug);
  if (!page) notFound();

  return (
    <DssApplicationShell>
      <article lang="uk" className="mx-auto w-full max-w-3xl space-y-5">
        <h1 className="text-3xl font-bold text-white">{page.title}</h1>
        <StaticPageDocument
          documentJson={page.documentJson}
          fileUrl={(mediaId) =>
            `${siteConfig.apiUrl}/pages/${page.slug}/files/${encodeURIComponent(mediaId)}`
          }
        />
      </article>
    </DssApplicationShell>
  );
}
