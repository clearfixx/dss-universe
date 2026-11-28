import { researchExcerpt } from './research-excerpt';
import { projectEditorPublicSearch, type EditorDocument } from '@dss/editor';
import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import {
  EDITOR_VIEWER_DOCUMENT_PROJECTOR,
  type EditorViewerDocumentProjector,
} from '@api/modules/editor';
import {
  RESEARCH_LAB_AUTHORITY_DECISIONS,
  type ResearchLabAuthorityDecisions,
} from '../contracts/research-lab-authority.contract';
import { researchAudience } from './research-audience';

@Injectable()
export class ResearchLabDelivery {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(RESEARCH_LAB_AUTHORITY_DECISIONS)
    private readonly authority: ResearchLabAuthorityDecisions,
    @Inject(EDITOR_VIEWER_DOCUMENT_PROJECTOR)
    private readonly editor: EditorViewerDocumentProjector,
  ) {}

  async categories() {
    const categories = await this.prisma.researchCategory.findMany({
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        sortOrder: true,
      },
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const byId = new Map(categories.map((category) => [category.id, category]));
    return categories.filter((category) => {
      const visited = new Set<string>();
      let current = category;
      while (current.parentId) {
        if (visited.has(current.id)) return false;
        visited.add(current.id);
        const parent = byId.get(current.parentId);
        if (!parent) return false;
        current = parent;
      }
      return true;
    });
  }

  async manuals(viewerId: string | null) {
    const scope = await this.scope(viewerId);
    const where = { ...scope.where, state: 'ACTIVE' as const };
    return this.prisma.researchManual.findMany({
      where: { isActive: true, chapters: { some: { page: where } } },
      select: {
        id: true,
        language: true,
        slug: true,
        title: true,
        description: true,
        chapters: {
          where: { page: where },
          orderBy: [{ position: 'asc' }, { pageId: 'asc' }],
          select: {
            position: true,
            page: {
              select: {
                id: true,
                slug: true,
                publishedRevision: { select: { title: true } },
              },
            },
          },
        },
      },
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
    });
  }

  async collections(viewerId: string | null) {
    const scope = await this.scope(viewerId);
    const where = { ...scope.where, state: 'ACTIVE' as const };
    return this.prisma.researchCollection.findMany({
      where: { isActive: true, items: { some: { page: where } } },
      select: {
        id: true,
        language: true,
        slug: true,
        title: true,
        description: true,
        items: {
          where: { page: where },
          orderBy: [{ position: 'asc' }, { pageId: 'asc' }],
          select: {
            position: true,
            page: {
              select: {
                id: true,
                slug: true,
                publishedRevision: { select: { title: true } },
              },
            },
          },
        },
      },
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
    });
  }

  private async scope(viewerId: string | null) {
    const facts = await this.authority.viewerFacts(viewerId, new Date());
    const where: Prisma.ResearchPageWhereInput = {
      state: { in: ['ACTIVE', 'ARCHIVED'] },
      publishedRevision: { is: { state: 'PUBLISHED' } },
      ...researchAudience(facts.groups, facts.authenticated),
    };
    return { facts, where, viewerId: facts.authenticated ? viewerId : null };
  }

  async permits(
    pageId: string,
    targetId: string,
    viewerId: string | null,
    capability: 'READ' | 'COMMENT' | 'REACT' | 'BOOKMARK' | 'SHARE',
  ) {
    const scope = await this.scope(viewerId);
    const page = await this.prisma.researchPage.findFirst({
      where: { id: pageId, interactionTargetId: targetId, ...scope.where },
      select: { state: true, allowComments: true, allowRating: true },
    });
    if (!page) return false;
    if (capability === 'READ') return true;
    if (page.state !== 'ACTIVE') return false;
    switch (capability) {
      case 'COMMENT':
        return scope.facts.authenticated && page.allowComments;
      case 'REACT':
        return scope.facts.authenticated && page.allowRating;
      case 'BOOKMARK':
        return scope.facts.authenticated;
      case 'SHARE':
        return true;
      default:
        return false;
    }
  }
  async page(
    viewerId: string | null,
    key: { id: string } | { language: string; slug: string },
  ) {
    const scope = await this.scope(viewerId);
    const page = await this.prisma.researchPage.findFirst({
      where: {
        AND: [
          scope.where,
          'id' in key
            ? key
            : {
                language: key.language,
                OR: [
                  { slug: key.slug },
                  {
                    slugAliases: {
                      some: { language: key.language, slug: key.slug },
                    },
                  },
                ],
              },
        ],
      },
      select: {
        id: true,
        language: true,
        slug: true,
        state: true,
        publicationGeneration: true,
        publishedRevision: {
          select: {
            id: true,
            title: true,
            summary: true,
            document: true,
            state: true,
          },
        },
      },
    });
    const revision = page?.publishedRevision;
    if (!page || revision?.state !== 'PUBLISHED') return null;
    const content = await this.editor.project(
      JSON.stringify(revision.document),
      scope.viewerId,
    );
    return {
      id: page.id,
      language: page.language,
      slug: page.slug,
      state: page.state,
      generation: page.publicationGeneration,
      revisionId: revision.id,
      title: revision.title,
      summary: revision.summary,
      documentJson: content.documentJson,
    };
  }

  async publicIndex(input: { id: string } | { after?: string; limit: number }) {
    const entries: {
      id: string;
      language: string;
      slug: string;
      title: string;
      description: string;
      updatedAt: Date;
    }[] = [];
    return this.prisma.$transaction(
      async (tx) => {
        let after = 'after' in input ? input.after : undefined;
        const limit = 'limit' in input ? input.limit : 1;
        while (entries.length < limit) {
          const pages = await tx.researchPage.findMany({
            where: {
              state: 'ACTIVE',
              visibility: 'PUBLIC',
              allowIndexing: true,
              lastPublishedAt: { not: null },
              id: 'id' in input ? input.id : after ? { gt: after } : undefined,
              publishedRevision: { is: { state: 'PUBLISHED' } },
            },
            orderBy: { id: 'asc' },
            take: Math.min(limit, 64),
            select: {
              id: true,
              language: true,
              slug: true,
              lastPublishedAt: true,
              publishedRevision: {
                select: { title: true, summary: true, document: true },
              },
            },
          });
          for (const page of pages) {
            const revision = page.publishedRevision;
            if (!revision || !page.lastPublishedAt) continue;
            const projection = await this.editor.project(
              JSON.stringify(revision.document),
              null,
            );
            const body = projectEditorPublicSearch(
              JSON.parse(projection.documentJson) as EditorDocument,
            ).searchText;
            if (!body) continue;
            entries.push({
              id: page.id,
              language: page.language,
              slug: page.slug,
              title: revision.title,
              description: revision.summary || researchExcerpt(body),
              updatedAt: page.lastPublishedAt,
            });
            if (entries.length === limit) break;
          }
          if ('id' in input || pages.length < Math.min(limit, 64)) break;
          after = pages[pages.length - 1].id;
        }
        return entries;
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async related(viewerId: string | null, pageId: string, limit: number) {
    const scope = await this.scope(viewerId);
    return this.prisma.$transaction(
      async (tx) => {
        const where = { ...scope.where, state: 'ACTIVE' as const };
        const source = await tx.researchPage.findFirst({
          where: { ...where, id: pageId },
          select: {
            primaryCategoryId: true,
            tags: { select: { tagId: true } },
            technologies: { select: { technologyId: true } },
            categories: { select: { categoryId: true } },
          },
        });
        if (!source) return [];
        const tags = source.tags.map((row) => row.tagId);
        const technologies = source.technologies.map((row) => row.technologyId);
        const categories = source.categories.map((row) => row.categoryId);
        if (source.primaryCategoryId) categories.push(source.primaryCategoryId);
        const rows = await tx.researchPage.findMany({
          where: {
            AND: [
              where,
              {
                id: { not: pageId },
                OR: [
                  { incomingLinks: { some: { sourcePageId: pageId } } },
                  { outgoingLinks: { some: { targetPageId: pageId } } },
                  { tags: { some: { tagId: { in: tags } } } },
                  {
                    technologies: {
                      some: { technologyId: { in: technologies } },
                    },
                  },
                  { primaryCategoryId: { in: categories } },
                  { categories: { some: { categoryId: { in: categories } } } },
                ],
              },
            ],
          },
          select: {
            id: true,
            language: true,
            slug: true,
            publishedRevision: { select: { title: true } },
            primaryCategoryId: true,
            categories: {
              where: { categoryId: { in: categories } },
              select: { categoryId: true },
            },
            _count: {
              select: {
                incomingLinks: { where: { sourcePageId: pageId } },
                outgoingLinks: { where: { targetPageId: pageId } },
                tags: { where: { tagId: { in: tags } } },
                technologies: { where: { technologyId: { in: technologies } } },
              },
            },
          },
        });
        return rows
          .flatMap((row) => {
            if (!row.publishedRevision) return [];
            const shared = new Set(
              row.categories.map((link) => link.categoryId),
            );
            if (
              row.primaryCategoryId &&
              categories.includes(row.primaryCategoryId)
            )
              shared.add(row.primaryCategoryId);
            const score =
              shared.size +
              Object.values(row._count).reduce((sum, count) => sum + count, 0);
            return [
              {
                id: row.id,
                language: row.language,
                slug: row.slug,
                title: row.publishedRevision.title,
                score,
              },
            ];
          })
          .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
          .slice(0, limit);
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async history(
    viewerId: string | null,
    pageId: string,
    offset: number,
    limit: number,
  ) {
    const scope = await this.scope(viewerId);
    if (!scope.facts.authenticated) return [];
    const revisions = await this.prisma.researchRevision.findMany({
      where: {
        pageId,
        page: scope.where,
        state: { in: ['PUBLISHED', 'SUPERSEDED'] },
      },
      select: {
        id: true,
        number: true,
        authorId: true,
        createdAt: true,
        editSummary: true,
        reviewDecisions: {
          where: { action: { in: ['PUBLISHED', 'ROLLED_BACK'] } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: { action: true },
        },
        state: true,
      },
      orderBy: { number: 'desc' },
      skip: offset,
      take: limit,
    });
    return revisions.map(({ reviewDecisions, ...entry }) => ({
      ...entry,
      publicationDecision: reviewDecisions[0]?.action ?? null,
    }));
  }

  async compare(
    viewerId: string | null,
    pageId: string,
    from: string,
    to: string,
  ) {
    const scope = await this.scope(viewerId);
    const revisions = await this.prisma.researchRevision.findMany({
      where: {
        pageId,
        page: scope.facts.guardian
          ? {
              OR: [
                scope.where,
                {
                  state: 'DRAFT',
                  ...researchAudience(scope.facts.groups, true),
                },
              ],
            }
          : scope.where,
        id: { in: [from, to] },
        ...(scope.facts.guardian
          ? {}
          : { state: { in: ['PUBLISHED', 'SUPERSEDED'] } }),
      },
      select: { id: true, document: true },
    });
    const left = revisions.find((row) => row.id === from);
    const right = revisions.find((row) => row.id === to);
    if (!left || !right) return null;
    const [before, after] = await Promise.all(
      [left, right].map((row) =>
        this.editor.project(JSON.stringify(row.document), scope.viewerId),
      ),
    );
    return {
      fromDocumentJson: before.documentJson,
      toDocumentJson: after.documentJson,
    };
  }
}
