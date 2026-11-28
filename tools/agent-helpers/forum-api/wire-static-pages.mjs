// Creates the static-pages module files and wires them in; run from the repo root.
import { readFileSync, writeFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
function edit(file, search, replace) {
  const source = read(file);
  if (!source.includes(search)) throw new Error(`${file}: ${search}`);
  writeFileSync(file, source.replace(search, () => replace));
}
const header = (module, path, purpose, important) => `/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: ${module}
 * 📄 File: ${path}
 *
 * 🎯 Purpose:
 * ${purpose}
 *
 * ⚠️ Important:
 * ${important}
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
`;
const api = "apps/api";
const pages = `${api}/src/modules/static-pages`;

writeFileSync(`${pages}/static-pages.module.ts`, header("Static Pages", `${pages}/static-pages.module.ts`, "Assembles static pages.", "The file port is bound by root composition.") + `import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@api/core/authorization';
import { EditorModule } from '@api/modules/editor';
import { StaticPagesService } from './infrastructure/prisma-static-pages';
import { StaticPagesResolver } from './presentation/static-pages.resolver';

@Module({
  imports: [AuthorizationModule, EditorModule],
  providers: [StaticPagesService, StaticPagesResolver],
})
export class StaticPagesModule {}
`);
writeFileSync(`${pages}/index.ts`, header("Static Pages", `${pages}/index.ts`, "Public entry of the module.", "Services stay private.") + `export { StaticPagesModule } from './static-pages.module';
`);
writeFileSync(`${pages}/infrastructure.ts`, header("Static Pages Persistence Composition", `${pages}/infrastructure.ts`, "Publishes the file port for guarded root composition.", "Business code must not import this entry.") + `export {
  STATIC_PAGE_MEDIA,
  STATIC_PAGE_MEDIA_PURPOSE,
  type StaticPageMedia,
} from './infrastructure/static-page-media.port';
`);

const composition = `${api}/src/composition/static-pages`;
writeFileSync(`${composition}/infrastructure/static-page-media.adapter.ts`, header("Static Pages Composition", `${composition}/infrastructure/static-page-media.adapter.ts`, "Binds the static page file port to the Media attachment policy and references.", "Wiring only.") + `import { Inject, Injectable } from '@nestjs/common';
import { PrismaService, type TransactionClient } from '@api/core/database';
import {
  MEDIA_ATTACHMENT_POLICY,
  type MediaAttachmentPolicy,
} from '@api/modules/media';
import {
  STATIC_PAGE_MEDIA_PURPOSE,
  type StaticPageMedia,
} from '@api/modules/static-pages/infrastructure';
import { syncDocumentMediaReferences } from '../../media-references/sync-document-media-references';

const scope = (pageId: string) => ({
  targetType: 'StaticPage',
  targetId: pageId,
  purpose: STATIC_PAGE_MEDIA_PURPOSE,
});

@Injectable()
export class StaticPageMediaAdapter implements StaticPageMedia {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDIA_ATTACHMENT_POLICY)
    private readonly policy: MediaAttachmentPolicy,
  ) {}

  async referencedIds(pageId: string): Promise<string[]> {
    const rows = await this.prisma.mediaReference.findMany({
      where: { ...scope(pageId), removedAt: null },
      select: { mediaId: true },
    });
    return rows.map(({ mediaId }) => mediaId);
  }

  async rejectedCount(
    actorId: string,
    mediaIds: readonly string[],
  ): Promise<number> {
    return (await this.policy.evaluate(actorId, mediaIds)).rejected.length;
  }

  sync(
    transaction: TransactionClient,
    pageId: string,
    actorId: string,
    mediaIds: readonly string[],
  ): Promise<void> {
    return syncDocumentMediaReferences(
      transaction,
      scope(pageId),
      actorId,
      mediaIds,
    );
  }
}
`);
writeFileSync(`${composition}/static-pages-integration.module.ts`, header("Static Pages Composition", `${composition}/static-pages-integration.module.ts`, "Provides the file port of static pages.", "Wiring only.") + `import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { MediaModule } from '@api/modules/media';
import { STATIC_PAGE_MEDIA } from '@api/modules/static-pages/infrastructure';
import { StaticPageMediaAdapter } from './infrastructure/static-page-media.adapter';

@Global()
@Module({
  imports: [PrismaModule, MediaModule],
  providers: [{ provide: STATIC_PAGE_MEDIA, useClass: StaticPageMediaAdapter }],
  exports: [STATIC_PAGE_MEDIA],
})
export class StaticPagesIntegrationModule {}
`);

const contract = `${api}/src/modules/editor/contracts/editor-document-normalizer.contract.ts`;
edit(contract, "  normalizeForumReply(documentJson: string): ValidatedEditorDocument;\n", "  normalizeForumReply(documentJson: string): ValidatedEditorDocument;\n  normalizeStaticPage(documentJson: string): ValidatedEditorDocument;\n");
edit(`${api}/src/modules/editor/application/services/editor-document-normalizer.service.ts`, "  normalizeForumReply(documentJson: string): ValidatedEditorDocument {\n", "  normalizeStaticPage(documentJson: string): ValidatedEditorDocument {\n    return this.editor.normalize(documentJson, 'ADMIN');\n  }\n  normalizeForumReply(documentJson: string): ValidatedEditorDocument {\n");

edit(`${api}/src/core/authorization/enums/permission.registry.ts`, "  ModerationBansManage: {\n", "  CmsPagesManage: {\n    key: 'cms.pages.manage',\n    label: 'Manage static pages',\n    description: 'Allows creating, editing and publishing static pages.',\n  },\n  ModerationBansManage: {\n");
edit(`${api}/prisma/seed/role-permissions.seed.ts`, "    Permission.ModerationBansManage,\n", "    Permission.ModerationBansManage,\n    Permission.CmsPagesManage,\n");

const app = `${api}/src/app.module.ts`;
edit(app, "import { ModerationBansIntegrationModule }", "import { StaticPagesIntegrationModule } from './composition/static-pages/static-pages-integration.module';\nimport { StaticPagesModule } from './modules/static-pages';\nimport { ModerationBansIntegrationModule }");
edit(app, "    ModerationBansIntegrationModule,\n", "    ModerationBansIntegrationModule,\n    StaticPagesIntegrationModule,\n    StaticPagesModule,\n");

const schema = `${api}/prisma/schema.prisma`;
edit(schema, "model CommunityRule {", `model StaticPage {
  id                   String    @id @default(uuid())
  slug                 String    @unique
  title                String
  description          String    @default("")
  document             Json
  revision             Int       @default(1)
  publishedTitle       String?
  publishedDescription String?
  publishedDocument    Json?
  publishedRevision    Int?
  publishedAt          DateTime?
  createdById          String
  updatedById          String
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @default(now()) @updatedAt

  createdBy User @relation("StaticPageCreator", fields: [createdById], references: [id], onDelete: Restrict)
  updatedBy User @relation("StaticPageEditor", fields: [updatedById], references: [id], onDelete: Restrict)

  @@map("static_pages")
}

model CommunityRule {`);
const users = read(schema);
const anchor = users.match(/\n  decidedBanAppeals +BanAppeal\[\] +@relation\("BanAppealDecider"\)\n/);
if (!anchor) throw new Error("User relation anchor");
writeFileSync(schema, users.replace(anchor[0], `${anchor[0]}  createdStaticPages      StaticPage[]                 @relation("StaticPageCreator")\n  updatedStaticPages      StaticPage[]                 @relation("StaticPageEditor")\n`));

edit(`${api}/test/prisma-schema-alignment.e2e-spec.ts`, "      'reputation_policy',\n", "      'reputation_policy',\n      'static_pages',\n");
