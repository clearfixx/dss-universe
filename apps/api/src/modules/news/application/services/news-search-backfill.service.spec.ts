/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Tests
 * 📄 File: apps/api/src/modules/news/application/services/news-search-backfill.service.spec.ts
 *
 * 🎯 Purpose:
 * Pins bounded complete traversal, source conflicts and private-data-safe backfill failures.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException } from '@nestjs/common';
import { NEWS_SEARCH_PROJECTION_VERSION } from '../../domain/constants/news-search-projection.constant';
import { NewsSearchInvalidSourceError } from '../../domain/errors/news-search-invalid-source.error';
import type { NewsSearchProjector } from '../../domain/ports/news-search-projector.interface';
import type { NewsSearchProjectionRepository } from '../../domain/repositories/news-search-projection.repository.interface';
import type { NewsSearchSource } from '../../domain/types/news-search-projection.type';
import { NewsSearchBackfillService } from './news-search-backfill.service';

describe('NewsSearchBackfillService', () => {
  const sources: NewsSearchSource[] = Array.from(
    { length: 601 },
    (_, index) => ({
      articleId: 'article-' + String(index).padStart(4, '0'),
      sourceVersion: index + 1,
      documentJson: 'synthetic-canonical-' + index,
    }),
  );
  const scanMissing = jest.fn<
    ReturnType<NewsSearchProjectionRepository['scanMissing']>,
    Parameters<NewsSearchProjectionRepository['scanMissing']>
  >();
  const install = jest.fn<
    ReturnType<NewsSearchProjectionRepository['install']>,
    Parameters<NewsSearchProjectionRepository['install']>
  >();
  const countMissing = jest.fn<
    ReturnType<NewsSearchProjectionRepository['countMissing']>,
    Parameters<NewsSearchProjectionRepository['countMissing']>
  >();
  const projectPublic = jest.fn<
    ReturnType<NewsSearchProjector['projectPublic']>,
    Parameters<NewsSearchProjector['projectPublic']>
  >();
  const projectForViewer = jest.fn<
    ReturnType<NewsSearchProjector['projectForViewer']>,
    Parameters<NewsSearchProjector['projectForViewer']>
  >();
  let service: NewsSearchBackfillService;

  beforeEach(() => {
    jest.resetAllMocks();
    install.mockResolvedValue(true);
    countMissing.mockResolvedValue(0);
    scanMissing.mockImplementation((_version, after, take) =>
      Promise.resolve(
        sources
          .filter(({ articleId }) => after === null || articleId > after)
          .slice(0, take),
      ),
    );
    projectPublic.mockReturnValue({
      searchText: 'public',
      hasContentGates: true,
    });
    service = new NewsSearchBackfillService(
      { scanMissing, install, countMissing },
      { projectPublic, projectForViewer },
    );
  });

  it.each([1, 64, 250])(
    'traverses all 601 sources in bounded batches of %s without a result cap',
    async (size) => {
      expect(await service.run(size)).toEqual({
        processed: 601,
        installed: 601,
        conflicts: 0,
        remaining: 0,
      });
      expect(scanMissing).toHaveBeenCalledTimes(Math.ceil(601 / size) + 1);
      expect(
        scanMissing.mock.calls.every(
          ([version, , take]) =>
            version === NEWS_SEARCH_PROJECTION_VERSION && take === size,
        ),
      ).toBe(true);
      expect(install).toHaveBeenCalledTimes(601);
      expect(install.mock.calls[600]).toEqual([
        {
          ...sources[600],
          projectionVersion: NEWS_SEARCH_PROJECTION_VERSION,
          publicSearchText: 'public',
          hasContentGates: true,
        },
      ]);
      expect(projectForViewer).not.toHaveBeenCalled();
    },
  );

  it('reports conflicts and a complete remaining count instead of claiming success', async () => {
    scanMissing
      .mockResolvedValueOnce(sources.slice(0, 2))
      .mockResolvedValueOnce([]);
    install.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    countMissing.mockResolvedValue(3);
    expect(await service.run()).toEqual({
      processed: 2,
      installed: 1,
      conflicts: 1,
      remaining: 3,
    });
  });

  it('does no projection or write when the complete scan is empty', async () => {
    scanMissing.mockResolvedValue([]);
    expect(await service.run()).toEqual({
      processed: 0,
      installed: 0,
      conflicts: 0,
      remaining: 0,
    });
    expect(projectPublic).not.toHaveBeenCalled();
    expect(install).not.toHaveBeenCalled();
  });

  it('stops on invalid canonical input with only the article ID, never the original failure payload', async () => {
    const privateFailure = new Error('synthetic protected payload');
    projectPublic.mockImplementation(() => {
      throw privateFailure;
    });
    await expect(service.run()).rejects.toEqual(
      new NewsSearchInvalidSourceError(sources[0].articleId),
    );
    await expect(service.run()).rejects.not.toThrow(privateFailure.message);
    expect(install).not.toHaveBeenCalled();
    expect(countMissing).not.toHaveBeenCalled();
  });

  it('propagates persistence failure rather than treating it as a stale-source conflict', async () => {
    const failure = new Error('Synthetic persistence unavailable');
    install.mockRejectedValue(failure);
    await expect(service.run()).rejects.toThrow(failure);
  });

  it('propagates readiness-count failure instead of returning a fabricated zero', async () => {
    scanMissing.mockResolvedValue([]);
    countMissing.mockRejectedValue(new Error('Synthetic count unavailable'));
    await expect(service.run()).rejects.toThrow('Synthetic count unavailable');
  });

  it.each([0, -1, 251, 1.5, NaN, Infinity])(
    'rejects invalid batch size %s before IO',
    async (size) => {
      await expect(service.run(size)).rejects.toThrow(BadRequestException);
      expect(scanMissing).not.toHaveBeenCalled();
    },
  );
});
