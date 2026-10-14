/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Composition Tests
 * 📄 File: apps/api/src/composition/content/news-search-projector.adapter.spec.ts
 *
 * 🎯 Purpose:
 * Pins minimal search evidence, opaque viewer forwarding and root provider binding.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { MODULE_METADATA } from '@nestjs/common/constants';
import type { EditorSearchProjector } from '@api/modules/editor';
import { NEWS_SEARCH_PROJECTOR } from '@api/modules/news';
import { ContentIntegrationModule } from './content-integration.module';
import { NewsSearchProjectorAdapter } from './infrastructure/news-search-projector.adapter';

describe('News search projection composition', () => {
  const projectPublic = jest.fn<
    ReturnType<EditorSearchProjector['projectPublic']>,
    Parameters<EditorSearchProjector['projectPublic']>
  >();
  const projectForViewer = jest.fn<
    ReturnType<EditorSearchProjector['projectForViewer']>,
    Parameters<EditorSearchProjector['projectForViewer']>
  >();
  const adapter = new NewsSearchProjectorAdapter({
    projectPublic,
    projectForViewer,
  });
  beforeEach(() => jest.resetAllMocks());

  it('binds the News-owned token to the root adapter without exporting concrete feature services', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ContentIntegrationModule),
    ).toContainEqual({
      provide: NEWS_SEARCH_PROJECTOR,
      useClass: NewsSearchProjectorAdapter,
    });
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, ContentIntegrationModule),
    ).toContain(NEWS_SEARCH_PROJECTOR);
  });

  it('selects only public index metadata or viewer-safe text from provider values', async () => {
    const publicEvidence = {
      searchText: 'public',
      hasContentGates: true,
      document: 'must not escape',
    };
    const viewerEvidence = {
      searchText: 'permitted',
      gates: ['must not escape'],
      document: 'must not escape',
    };
    projectPublic.mockReturnValue(publicEvidence);
    projectForViewer.mockResolvedValue(viewerEvidence);
    expect(adapter.projectPublic('canonical')).toEqual({
      searchText: 'public',
      hasContentGates: true,
    });
    expect(
      await adapter.projectForViewer('canonical', 'opaque-viewer'),
    ).toEqual({ searchText: 'permitted' });
    expect(projectPublic.mock.calls).toEqual([['canonical']]);
    expect(projectForViewer.mock.calls).toEqual([
      ['canonical', 'opaque-viewer'],
    ]);
  });

  it('propagates validation and decision failures without partial or raw evidence', async () => {
    const failure = new Error('Synthetic unavailable');
    projectPublic.mockImplementation(() => {
      throw failure;
    });
    projectForViewer.mockRejectedValue(failure);
    expect(() => adapter.projectPublic('canonical')).toThrow(failure);
    await expect(
      adapter.projectForViewer('canonical', 'viewer'),
    ).rejects.toThrow(failure);
  });
});
