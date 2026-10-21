/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/application/services/news-search-backfill.service.ts
 *
 * 🎯 Purpose:
 * Rebuilds missing public search evidence without overwriting concurrent authored edits.
 *
 * 🧠 Responsibilities:
 * • traverses every missing source in bounded keyset batches, without a corpus limit;
 * • obtains canonical public text through the News-owned projection port;
 * • reports source conflicts and remaining work instead of claiming partial success.
 *
 * 🏗️ Architecture:
 * News application maintenance; validation stays Editor-owned and locking stays private persistence.
 *
 * ⚠️ Important:
 * A failed document is repair-required, never a raw-index fallback.
 * Successfully installed earlier rows are resumable derived data, not authored-history changes.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { NewsSearchIndexMaintenance } from '../../contracts/news-search-index-maintenance.contract';
import { NEWS_SEARCH_PROJECTION_VERSION } from '../../domain/constants/news-search-projection.constant';
import { NewsSearchInvalidSourceError } from '../../domain/errors/news-search-invalid-source.error';
import {
  NEWS_SEARCH_PROJECTOR,
  type NewsSearchProjector,
} from '../../domain/ports/news-search-projector.interface';
import {
  NEWS_SEARCH_PROJECTION_REPOSITORY,
  type NewsSearchProjectionRepository,
} from '../../domain/repositories/news-search-projection.repository.interface';
import type { NewsSearchBackfillResult } from '../../domain/types/news-search-projection.type';

@Injectable()
export class NewsSearchBackfillService implements NewsSearchIndexMaintenance {
  constructor(
    @Inject(NEWS_SEARCH_PROJECTION_REPOSITORY)
    private readonly projections: NewsSearchProjectionRepository,
    @Inject(NEWS_SEARCH_PROJECTOR)
    private readonly projector: NewsSearchProjector,
  ) {}

  async check(): Promise<Readonly<{ remaining: number }>> {
    return {
      remaining: await this.projections.countMissing(
        NEWS_SEARCH_PROJECTION_VERSION,
      ),
    };
  }

  async run(batchSize = 64): Promise<NewsSearchBackfillResult> {
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 250) {
      throw new BadRequestException(
        'News search backfill batch size must be 1–250.',
      );
    }
    let afterId: string | null = null;
    let processed = 0;
    let installed = 0;
    for (;;) {
      const sources = await this.projections.scanMissing(
        NEWS_SEARCH_PROJECTION_VERSION,
        afterId,
        batchSize,
      );
      if (sources.length === 0) break;
      for (const source of sources) {
        let evidence: ReturnType<NewsSearchProjector['projectPublic']>;
        try {
          evidence = this.projector.projectPublic(source.documentJson);
        } catch {
          throw new NewsSearchInvalidSourceError(source.articleId);
        }
        const written = await this.projections.install({
          ...source,
          projectionVersion: NEWS_SEARCH_PROJECTION_VERSION,
          publicSearchText: evidence.searchText,
          hasContentGates: evidence.hasContentGates,
        });
        processed += 1;
        if (written) installed += 1;
      }
      afterId = sources[sources.length - 1].articleId;
    }
    return {
      processed,
      installed,
      conflicts: processed - installed,
      remaining: (await this.check()).remaining,
    };
  }
}

/** If rebuilding the index starts rewriting articles, put the UPDATE down and get coffee. */
