import { researchExcerpt } from './research-excerpt';
import { Inject, Injectable } from '@nestjs/common';
import { projectEditorSearchText, type EditorDocument } from '@dss/editor';
import { PrismaService } from '@api/core/database';
import {
  EDITOR_VIEWER_DOCUMENT_PROJECTOR,
  type EditorViewerDocumentProjector,
} from '@api/modules/editor';
import {
  RESEARCH_LAB_AUTHORITY_DECISIONS,
  type ResearchLabAuthorityDecisions,
} from '../contracts/research-lab-authority.contract';
import type { ResearchSearchSource } from '../contracts/research-search-source';
import { researchAudience } from './research-audience';

@Injectable()
export class ResearchLabSearch implements ResearchSearchSource {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(RESEARCH_LAB_AUTHORITY_DECISIONS)
    private readonly authority: ResearchLabAuthorityDecisions,
    @Inject(EDITOR_VIEWER_DOCUMENT_PROJECTOR)
    private readonly editor: EditorViewerDocumentProjector,
  ) {}
  async search(query: Parameters<ResearchSearchSource['search']>[0]) {
    const viewer = query.viewerId ?? null;
    const facts = await this.authority.viewerFacts(viewer, new Date());
    const term = query.term.trim().normalize('NFC').toLowerCase();
    const start = (query.page - 1) * query.pageSize;
    const items: Awaited<ReturnType<ResearchSearchSource['search']>>['items'] =
      [];
    const counts = new Map<string, number>();
    let total = 0;
    return this.prisma.$transaction(
      async (tx) => {
        const batchSize = 64;
        let cursor: { id: string; publishedAt: Date } | undefined;
        for (;;) {
          const pages = await tx.researchPage.findMany({
            take: batchSize,

            where: {
              state: 'ACTIVE',
              allowIndexing: true,
              lastPublishedAt: { not: null },
              AND: cursor
                ? [
                    {
                      OR: [
                        { lastPublishedAt: { lt: cursor.publishedAt } },
                        {
                          lastPublishedAt: cursor.publishedAt,
                          id: { gt: cursor.id },
                        },
                      ],
                    },
                  ]
                : undefined,
              publishedRevision: { is: { state: 'PUBLISHED' } },
              ...researchAudience(facts.groups, facts.authenticated),
            },
            select: {
              id: true,
              language: true,
              slug: true,
              kind: true,
              lastPublishedAt: true,
              primaryCategory: { select: { slug: true, isActive: true } },
              publishedRevision: {
                select: {
                  id: true,
                  title: true,
                  summary: true,
                  document: true,
                },
              },
            },
            orderBy: [{ lastPublishedAt: 'desc' }, { id: 'asc' }],
          });
          for (const page of pages) {
            const revision = page.publishedRevision;
            if (!revision || !page.lastPublishedAt) continue;
            const safe = await this.editor.project(
              JSON.stringify(revision.document),
              facts.authenticated ? viewer : null,
            );
            const body = projectEditorSearchText(
              JSON.parse(safe.documentJson) as EditorDocument,
            );
            const text = [revision.title, revision.summary, body]
              .join(' ')
              .normalize('NFC');
            if (!text.toLowerCase().includes(term)) continue;
            if (page.primaryCategory?.isActive) {
              const slug = page.primaryCategory.slug;
              counts.set(slug, (counts.get(slug) ?? 0) + 1);
            }
            if (total >= start && items.length < query.pageSize)
              items.push({
                id: page.id,
                revisionId: revision.id,
                kind: page.kind,
                language: page.language,
                slug: page.slug,
                title: revision.title,
                excerpt: researchExcerpt(revision.summary || body),
                publishedAt: page.lastPublishedAt,
              });
            total++;
          }
          if (pages.length < batchSize) break;
          const last = pages[pages.length - 1];
          if (!last.lastPublishedAt)
            throw new Error('Missing Research Lab publication timestamp.');
          cursor = { id: last.id, publishedAt: last.lastPublishedAt };
        }
        return {
          items,
          total,
          categories: [...counts]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([slug, total]) => ({ slug, total })),
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
}
