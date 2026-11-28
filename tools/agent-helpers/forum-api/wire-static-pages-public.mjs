// Wires the public side of static pages; run from the repo root.
import { readFileSync, writeFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
function edit(file, search, replace) {
  const source = read(file);
  if (!source.includes(search)) throw new Error(`${file}: ${search}`);
  writeFileSync(file, source.replace(search, () => replace));
}
const media = "apps/api/src/modules/media";
const mediaModule = `${media}/media.module.ts`;
edit(mediaModule, "import { StorageModule } from '@api/core/storage';\n", "import { StorageModule } from '@api/core/storage';\nimport { MEDIA_REFERENCED_FILES } from './contracts/referenced-files.contract';\nimport { PrismaReferencedFiles } from './infrastructure/repositories/prisma-referenced-files';\n");
edit(mediaModule, "    MediaAppealScreenshotsService,\n", "    { provide: MEDIA_REFERENCED_FILES, useClass: PrismaReferencedFiles },\n    MediaAppealScreenshotsService,\n");
edit(mediaModule, "    MEDIA_APPEAL_SCREENSHOTS,\n  ],\n})", "    MEDIA_APPEAL_SCREENSHOTS,\n    MEDIA_REFERENCED_FILES,\n  ],\n})");
writeFileSync(`${media}/index.ts`, `${read(`${media}/index.ts`).trimEnd()}\nexport {\n  MEDIA_REFERENCED_FILES,\n  type MediaReferencedFiles,\n  type MediaReferencedFile,\n} from './contracts/referenced-files.contract';\n`);
for (const spec of ["news-attachment-boundaries", "content-read-boundaries"]) {
  const file = `apps/api/src/composition/content-reads/${spec}.spec.ts`;
  edit(file, "      MEDIA_APPEAL_SCREENSHOTS,\n    ]);", "      MEDIA_APPEAL_SCREENSHOTS,\n      MEDIA_REFERENCED_FILES,\n    ]);");
  edit(file, "import { MEDIA_APPEAL_SCREENSHOTS } from '@api/modules/media';", "import {\n  MEDIA_APPEAL_SCREENSHOTS,\n  MEDIA_REFERENCED_FILES,\n} from '@api/modules/media';");
}
edit("scripts/architecture/analyze-boundaries.test.mjs", '      "MEDIA_APPEAL_SCREENSHOTS",\n', '      "MEDIA_APPEAL_SCREENSHOTS",\n      "MEDIA_REFERENCED_FILES",\n      "MediaReferencedFiles",\n      "MediaReferencedFile",\n');

const pages = "apps/api/src/modules/static-pages";
edit(`${pages}/infrastructure/static-page-media.port.ts`, "export interface StaticPageMedia {\n", "export type StaticPageFile = Readonly<{\n  content: Buffer;\n  mimeType: string;\n  checksum: string;\n  filename: string;\n}>;\n\nexport interface StaticPageMedia {\n  /** The bytes of a file this page references, if it is READY. */\n  open(pageId: string, mediaId: string): Promise<StaticPageFile | null>;\n");
edit(`${pages}/infrastructure.ts`, "  type StaticPageMedia,\n", "  type StaticPageMedia,\n  type StaticPageFile,\n");
const service = `${pages}/infrastructure/prisma-static-pages.ts`;
edit(service, "  /** Addresses of published pages (sitemap). */\n", `  /** A file of the published snapshot; drafts' files stay private. */
  async publishedFile(
    slug: string,
    mediaId: string,
  ): Promise<StaticPageFile | null> {
    const row = await this.prisma.staticPage.findUnique({
      where: { slug },
      select: { id: true, publishedDocument: true, publishedAt: true },
    });
    if (!row?.publishedAt || !this.mediaOf(row.publishedDocument).includes(mediaId))
      return null;
    return this.media.open(row.id, mediaId);
  }

  /** Addresses of published pages (sitemap). */
`);
edit(service, "  STATIC_PAGE_MEDIA,\n  type StaticPageMedia,\n", "  STATIC_PAGE_MEDIA,\n  type StaticPageFile,\n  type StaticPageMedia,\n");
const moduleFile = `${pages}/static-pages.module.ts`;
edit(moduleFile, "import { StaticPagesResolver }", "import { StaticPageFilesController } from './presentation/static-page-files.controller';\nimport { StaticPagesResolver }");
edit(moduleFile, "  providers: [StaticPagesService, StaticPagesResolver],\n", "  providers: [StaticPagesService, StaticPagesResolver],\n  controllers: [StaticPageFilesController],\n");

const adapter = "apps/api/src/composition/static-pages/infrastructure/static-page-media.adapter.ts";
edit(adapter, "  MEDIA_ATTACHMENT_POLICY,\n  type MediaAttachmentPolicy,\n", "  MEDIA_ATTACHMENT_POLICY,\n  MEDIA_REFERENCED_FILES,\n  type MediaAttachmentPolicy,\n  type MediaReferencedFiles,\n");
edit(adapter, "    private readonly policy: MediaAttachmentPolicy,\n  ) {}\n", "    private readonly policy: MediaAttachmentPolicy,\n    @Inject(MEDIA_REFERENCED_FILES)\n    private readonly files: MediaReferencedFiles,\n  ) {}\n\n  open(pageId: string, mediaId: string) {\n    return this.files.open({ ...scope(pageId), mediaId });\n  }\n");

// The e2e proves that only published files are served.
const e2e = "apps/api/test/static-pages.e2e-spec.ts";
edit(e2e, "    await pages.unpublish(actor, created.id);\n    await expect(publicPage(slug)).resolves.toBeNull();\n", `    // A file is served only while the published snapshot contains it.
    const prisma = app.get(PrismaService);
    const media = await prisma.media.create({
      data: {
        ownerId: actor.id,
        kind: 'IMAGE',
        status: 'READY',
        visibility: 'PRIVATE',
        bucket: 'media',
        storageKey: \`media/test/\${suffix}.webp\`,
        originalFilename: 'map.webp',
        mimeType: 'image/webp',
        extension: 'webp',
        size: 3,
        checksum: 'abc',
      },
    });
    await app.get(StorageService).saveObject(
      {
        storageProvider: media.storageProvider as never,
        bucket: media.bucket,
        storageKey: media.storageKey,
      },
      Buffer.from('img'),
      'image/webp',
    );
    const withImage = JSON.stringify({
      ...createEmptyEditorDocument('ADMIN'),
      content: {
        type: 'doc',
        content: [
          {
            type: 'mediaReference',
            attrs: { mediaId: media.id, alt: 'Map', caption: '' },
          },
        ],
      },
    });
    const file = () =>
      request(app.getHttpServer()).get(
        \`/api/pages/\${slug}/files/\${media.id}\`,
      );
    await pages.save(actor, created.id, 2, {
      ...input,
      documentJson: withImage,
    });
    await file().expect(404);
    await pages.publish(actor, created.id, 3);
    const served = await file().expect(200);
    expect(served.headers['content-type']).toContain('image/webp');
    expect(served.headers['x-content-type-options']).toBe('nosniff');

    await pages.unpublish(actor, created.id);
    await file().expect(404);
    await expect(publicPage(slug)).resolves.toBeNull();
`);
edit(e2e, "      'cms.page_published',\n      'cms.page_unpublished',\n", "      'cms.page_published',\n      'cms.page_saved',\n      'cms.page_published',\n      'cms.page_unpublished',\n");
edit(e2e, "import { PrismaService } from './../src/core/database';\n", "import { PrismaService } from './../src/core/database';\nimport { StorageService } from './../src/core/storage';\n");

// ---- Web.
const graphql = "apps/web/src/graphql/operations/static-pages.graphql";
writeFileSync(graphql, `${read(graphql).trimEnd()}

query PublishedStaticPage($slug: String!) {
  staticPage(slug: $slug) {
    slug
    title
    description
    documentJson
    publishedAt
  }
}

query PublishedStaticPages {
  publishedStaticPages {
    slug
    publishedAt
  }
}
`);
const sitemap = "apps/web/src/app/sitemap.ts";
{
  let source = read(sitemap);
  if (!source.includes("  const articles = new Map<")) throw new Error("sitemap");
  source = source.replace("  const articles = new Map<", `  // Static pages and News fail independently.
  const pageEntries = await loadPublishedStaticPageIndex()
    .then((pages) =>
      pages.map((page) => ({
        url: new URL(\`/pages/\${page.slug}\`, siteConfig.url).toString(),
        lastModified: new Date(String(page.publishedAt)),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    )
    .catch(() => []);
  const articles = new Map<`);
  if (!source.includes("    return staticEntries;\n  }")) throw new Error("sitemap fallback");
  source = source.replace("    return staticEntries;\n  }", "    return [...staticEntries, ...pageEntries];\n  }");
  source = source.replace("  return [\n    ...staticEntries,\n", "  return [\n    ...staticEntries,\n    ...pageEntries,\n");
  source = source.replace('import { siteConfig }', 'import { loadPublishedStaticPageIndex } from "@/features/static-pages/static-page-data";\nimport { siteConfig }');
  writeFileSync(sitemap, source);
}
const editor = "apps/web/src/features/static-pages/static-page-editor.tsx";
edit(editor, "        {state?.published ? (\n          <Button\n", "        {state?.published ? (\n          <Link\n            href={`/pages/${slug}`}\n            className=\"mr-auto self-center text-sm text-violet-300 hover:underline\"\n          >\n            Відкрити на сайті\n          </Link>\n        ) : null}\n        {state?.published ? (\n          <Button\n");
