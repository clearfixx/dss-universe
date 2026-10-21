/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: News Boundary Tests
 * 📄 File: apps/api/src/composition/news-public-surface.spec.ts
 *
 * 🎯 Purpose:
 * Pins explicit News integration exports while preserving private runtime providers.
 *
 * 🧠 Responsibilities:
 * • rejects wildcard and application/repository re-exports;
 * • verifies only reviewed Nest integration tokens cross the boundary;
 * • preserves existing owned service and persistence registrations.
 *
 * 🏗️ Architecture:
 * Source/metadata tests; private imports are fixture access, not runtime APIs.
 *
 * ⚠️ Important:
 * Full build and migrated HTTP suites separately verify assembly and behavior.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MODULE_METADATA } from '@nestjs/common/constants';
import {
  createSourceFile,
  isExportDeclaration,
  isNamedExports,
  ScriptTarget,
} from 'typescript';
import {
  NewsModule,
  NEWS_SEARCH_INDEX_MAINTENANCE,
  NEWS_INTERACTION_DECISIONS,
} from '../modules/news';
import { NewsService } from '../modules/news/application/services/news.service';
import { NewsDeliveryService } from '../modules/news/application/services/news-delivery.service';
import { NewsLinksService } from '../modules/news/application/services/news-links.service';
import { NewsSchedulerService } from '../modules/news/application/services/news-scheduler.service';
import { NewsSettingsService } from '../modules/news/application/services/news-settings.service';
import { NewsTaxonomyService } from '../modules/news/application/services/news-taxonomy.service';
import { NewsWorkflowService } from '../modules/news/application/services/news-workflow.service';
import { NewsPinsService } from '../modules/news/application/services/news-pins.service';
import { NewsPostTemplateService } from '../modules/news/application/services/news-post-template.service';
import { NEWS_REPOSITORY } from '../modules/news/domain/repositories/news.repository.interface';
import { NEWS_LINKS_REPOSITORY } from '../modules/news/domain/repositories/news-links.repository.interface';
import { NEWS_SETTINGS_REPOSITORY } from '../modules/news/domain/repositories/news-settings.repository.interface';
import { NEWS_TAXONOMY_REPOSITORY } from '../modules/news/domain/repositories/news-taxonomy.repository.interface';
import { NEWS_WORKFLOW_REPOSITORY } from '../modules/news/domain/repositories/news-workflow.repository.interface';
import { NEWS_PINS_REPOSITORY } from '../modules/news/domain/repositories/news-pins.repository.interface';

describe('News public surface', () => {
  it('publishes only named non-application integration declarations', () => {
    const source = createSourceFile(
      'index.ts',
      readFileSync(join(__dirname, '../modules/news/index.ts'), 'utf8'),
      ScriptTarget.Latest,
    );
    const declarations = source.statements.filter(isExportDeclaration);
    expect(declarations.length).toBeGreaterThan(0);
    for (const declaration of declarations) {
      expect(
        declaration.exportClause && isNamedExports(declaration.exportClause),
      ).toBe(true);
      expect(declaration.moduleSpecifier?.getText(source)).not.toMatch(
        /application|repositories/,
      );
    }
  });
  it('exports exactly its two current Nest integration tokens', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, NewsModule)).toEqual([
      NEWS_SEARCH_INDEX_MAINTENANCE,
      NEWS_INTERACTION_DECISIONS,
    ]);
  });
  it('retains all nine private service providers', () => {
    const providers: unknown = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      NewsModule,
    );
    for (const provider of [
      NewsService,
      NewsDeliveryService,
      NewsLinksService,
      NewsSchedulerService,
      NewsSettingsService,
      NewsTaxonomyService,
      NewsWorkflowService,
      NewsPinsService,
      NewsPostTemplateService,
    ])
      expect(providers).toContain(provider);
  });
  it('retains the six private repository bindings', () => {
    const providers: unknown = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      NewsModule,
    );
    if (!Array.isArray(providers)) throw new Error('Missing News providers');
    for (const token of [
      NEWS_REPOSITORY,
      NEWS_LINKS_REPOSITORY,
      NEWS_SETTINGS_REPOSITORY,
      NEWS_TAXONOMY_REPOSITORY,
      NEWS_WORKFLOW_REPOSITORY,
      NEWS_PINS_REPOSITORY,
    ]) {
      expect(providers).toEqual(
        expect.arrayContaining([expect.objectContaining({ provide: token })]),
      );
    }
  });
});
