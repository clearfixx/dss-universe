/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Static Pages
 * 📄 File: apps/api/src/modules/static-pages/infrastructure/prisma-static-pages.ts
 *
 * 🎯 Purpose:
 * Static pages (owner 2026-11-28): administrators edit a working copy and
 * publish a snapshot of it; visitors read only the snapshot.
 *
 * ⚠️ Important:
 * Every write checks the expected revision and is audited. Files of both the
 * working copy and the snapshot stay referenced.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type StaticPage } from '@prisma/client';
import { collectEditorMediaIds, type EditorDocument } from '@dss/editor';
import { AuditWriterService } from '@api/core/audit';
import { Permission } from '@api/core/authorization';
import { PrismaService, type TransactionClient } from '@api/core/database';
import {
  EDITOR_DOCUMENT_NORMALIZER,
  type EditorDocumentNormalizer,
} from '@api/modules/editor';
import {
  containsNode,
  normalizeDescription,
  normalizeSlug,
  normalizeTitle,
  StaticPageError,
} from '../domain/static-page.rules';
import {
  STATIC_PAGE_MEDIA,
  type StaticPageMedia,
} from './static-page-media.port';

export type StaticPageActor = { id: string; permissions: readonly string[] };

export type StaticPageInput = {
  slug: string;
  title: string;
  description: string;
  documentJson: string;
};

export type StaticPageView = {
  id: string;
  slug: string;
  title: string;
  description: string;
  documentJson: string;
  revision: number;
  publishedAt: Date | null;
  hasUnpublishedChanges: boolean;
  updatedAt: Date;
};

export type PublicStaticPage = {
  slug: string;
  title: string;
  description: string;
  documentJson: string;
  publishedAt: Date;
};

@Injectable()
export class StaticPagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    @Inject(EDITOR_DOCUMENT_NORMALIZER)
    private readonly editor: EditorDocumentNormalizer,
    @Inject(STATIC_PAGE_MEDIA) private readonly media: StaticPageMedia,
  ) {}

  async list(actor: StaticPageActor): Promise<StaticPageView[]> {
    this.require(actor);
    const rows = await this.prisma.staticPage.findMany({
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.view(row));
  }

  async get(actor: StaticPageActor, id: string): Promise<StaticPageView> {
    this.require(actor);
    return this.view(await this.row(id));
  }

  async create(
    actor: StaticPageActor,
    input: StaticPageInput,
  ): Promise<StaticPageView> {
    this.require(actor);
    const { document, ...facts } = this.normalize(input);
    const mediaIds = await this.attachable(actor.id, document, []);
    return this.write(async (tx) => {
      const row = await tx.staticPage.create({
        data: {
          ...facts,
          document: document as unknown as Prisma.InputJsonValue,
          createdById: actor.id,
          updatedById: actor.id,
        },
      });
      await this.media.sync(tx, row.id, actor.id, mediaIds);
      await this.record(tx, actor.id, 'created', row);
      return this.view(row);
    });
  }

  async save(
    actor: StaticPageActor,
    id: string,
    expectedRevision: number,
    input: StaticPageInput,
  ): Promise<StaticPageView> {
    this.require(actor);
    const { document, ...facts } = this.normalize(input);
    const current = await this.row(id);
    if (current.publishedAt && facts.slug !== current.slug)
      throw new StaticPageError(
        'INVALID_INPUT',
        'Unpublish the page before changing its address.',
      );
    const mediaIds = await this.attachable(
      actor.id,
      document,
      await this.media.referencedIds(id),
    );
    return this.write(async (tx) => {
      const row = await this.change(tx, id, expectedRevision, {
        ...facts,
        document: document as unknown as Prisma.InputJsonValue,
        revision: expectedRevision + 1,
        updatedById: actor.id,
      });
      await this.media.sync(tx, id, actor.id, this.kept(row, mediaIds));
      await this.record(tx, actor.id, 'saved', row);
      return this.view(row);
    });
  }

  async publish(
    actor: StaticPageActor,
    id: string,
    expectedRevision: number,
  ): Promise<StaticPageView> {
    this.require(actor);
    const current = await this.row(id);
    return this.write(async (tx) => {
      const row = await this.change(tx, id, expectedRevision, {
        publishedTitle: current.title,
        publishedDescription: current.description,
        publishedDocument: current.document as Prisma.InputJsonValue,
        publishedRevision: expectedRevision,
        publishedAt: new Date(),
        updatedById: actor.id,
      });
      await this.media.sync(
        tx,
        id,
        actor.id,
        this.kept(row, this.mediaOf(row.document)),
      );
      await this.record(tx, actor.id, 'published', row);
      return this.view(row);
    });
  }

  async unpublish(actor: StaticPageActor, id: string): Promise<StaticPageView> {
    this.require(actor);
    await this.row(id);
    return this.write(async (tx) => {
      const changed = await tx.staticPage.updateMany({
        where: { id, publishedAt: { not: null } },
        data: {
          publishedTitle: null,
          publishedDescription: null,
          publishedDocument: Prisma.DbNull,
          publishedRevision: null,
          publishedAt: null,
          updatedById: actor.id,
        },
      });
      if (changed.count !== 1)
        throw new StaticPageError('CONFLICT', 'The page is not published.');
      const row = await tx.staticPage.findUniqueOrThrow({ where: { id } });
      await this.media.sync(tx, id, actor.id, this.mediaOf(row.document));
      await this.record(tx, actor.id, 'unpublished', row);
      return this.view(row);
    });
  }

  /** The published snapshot, or null: drafts are invisible to visitors. */
  async published(slug: string): Promise<PublicStaticPage | null> {
    const row = await this.prisma.staticPage.findUnique({ where: { slug } });
    if (!row?.publishedAt || !row.publishedTitle) return null;
    return {
      slug: row.slug,
      title: row.publishedTitle,
      description: row.publishedDescription ?? '',
      documentJson: JSON.stringify(row.publishedDocument),
      publishedAt: row.publishedAt,
    };
  }

  /** Addresses of published pages (sitemap). */
  async publishedIndex(): Promise<Array<{ slug: string; publishedAt: Date }>> {
    const rows = await this.prisma.staticPage.findMany({
      where: { publishedAt: { not: null } },
      select: { slug: true, publishedAt: true },
      orderBy: { slug: 'asc' },
      take: 1000,
    });
    return rows.map((row) => ({
      slug: row.slug,
      publishedAt: row.publishedAt!,
    }));
  }

  private normalize(input: StaticPageInput) {
    const { document } = this.editor.normalizeStaticPage(input.documentJson);
    if (containsNode(document.content, 'contentGate'))
      throw new StaticPageError(
        'INVALID_INPUT',
        'Static pages are public and cannot hide content.',
      );
    return {
      slug: normalizeSlug(input.slug),
      title: normalizeTitle(input.title),
      description: normalizeDescription(input.description),
      document,
    };
  }

  private mediaOf(document: unknown): string[] {
    return collectEditorMediaIds(document as EditorDocument);
  }

  /** Files of the document; only newly added ones need the actor's right. */
  private async attachable(
    actorId: string,
    document: EditorDocument,
    referenced: readonly string[],
  ): Promise<string[]> {
    const mediaIds = this.mediaOf(document);
    const added = mediaIds.filter((id) => !referenced.includes(id));
    if (added.length && (await this.media.rejectedCount(actorId, added)))
      throw new StaticPageError(
        'INVALID_INPUT',
        'A file is missing, still processing or not yours to attach.',
      );
    return mediaIds;
  }

  /** The working copy's files together with the published ones. */
  private kept(row: StaticPage, draft: readonly string[]): string[] {
    const published = row.publishedDocument
      ? this.mediaOf(row.publishedDocument)
      : [];
    return [...new Set([...draft, ...published])];
  }

  private async change(
    tx: TransactionClient,
    id: string,
    expectedRevision: number,
    data: Prisma.StaticPageUncheckedUpdateManyInput,
  ): Promise<StaticPage> {
    const changed = await tx.staticPage.updateMany({
      where: { id, revision: expectedRevision },
      data,
    });
    if (changed.count !== 1)
      throw new StaticPageError(
        'CONFLICT',
        'The page changed in the meantime. Reload it and try again.',
      );
    return tx.staticPage.findUniqueOrThrow({ where: { id } });
  }

  private async row(id: string): Promise<StaticPage> {
    const row = await this.prisma.staticPage.findUnique({ where: { id } });
    if (!row) throw new StaticPageError('NOT_FOUND', 'Page not found.');
    return row;
  }

  private async write<T>(
    work: (tx: TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(work);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new StaticPageError('CONFLICT', 'This address is already taken.');
      throw error;
    }
  }

  private record(
    tx: TransactionClient,
    actorId: string,
    verb: 'created' | 'saved' | 'published' | 'unpublished',
    row: StaticPage,
  ) {
    return this.audit.append(tx, {
      action: `cms.page_${verb}`,
      actorType: 'USER',
      actorId,
      targetType: 'StaticPage',
      targetId: row.id,
      metadata: { slug: row.slug, revision: row.revision },
    });
  }

  private require(actor: StaticPageActor): void {
    if (!actor.permissions.includes(Permission.CmsPagesManage))
      throw new StaticPageError(
        'ACCESS_DENIED',
        'Static pages are managed by administrators.',
      );
  }

  private view(row: StaticPage): StaticPageView {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      documentJson: JSON.stringify(row.document),
      revision: row.revision,
      publishedAt: row.publishedAt,
      hasUnpublishedChanges:
        row.publishedAt !== null && row.publishedRevision !== row.revision,
      updatedAt: row.updatedAt,
    };
  }
}
