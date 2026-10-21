/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Feature Boundary Verification
 * 📄 File: apps/api/src/composition/feature-public-surfaces.spec.ts
 *
 * 🎯 Purpose:
 * Prevents unused application services from becoming cross-feature integration APIs.
 *
 * 🧠 Responsibilities:
 * • pins named module roots and their minimal Nest exports;
 * • preserves private application providers for local presentation.
 *
 * 🏗️ Architecture:
 * Composition-level source and metadata regression; no runtime provider requests.
 *
 * ⚠️ Important:
 * A test may inspect owner internals; a production feature must use its contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createSourceFile,
  isExportDeclaration,
  isNamedExports,
  ScriptTarget,
} from 'typescript';
import { CustomTitlesModule } from '@api/modules/custom-titles';
import { LeaderboardsModule } from '@api/modules/leaderboards';
import {
  InteractionsModule,
  COMMENT_COUNT_READER,
  INTERACTION_POLICY_REGISTRATIONS,
} from '@api/modules/interactions';
import { CustomTitlesService } from '../modules/custom-titles/application/services/custom-titles.service';
import { LeaderboardsService } from '../modules/leaderboards/application/services/leaderboards.service';
import { BookmarksService } from '../modules/interactions/application/services/bookmarks.service';
import { CommentDraftsService } from '../modules/interactions/application/services/comment-drafts.service';
import { CommentsService } from '../modules/interactions/application/services/comments.service';
import { InteractionTargetsService } from '../modules/interactions/application/services/interaction-targets.service';
import { ReactionsService } from '../modules/interactions/application/services/reactions.service';
import { AudienceEngagementService } from '../modules/interactions/application/services/audience-engagement.service';
import { ModerationService } from '../modules/interactions/application/services/moderation.service';

describe.each([
  {
    name: 'custom-titles',
    module: CustomTitlesModule,
    exports: [],
    providers: [CustomTitlesService],
  },
  {
    name: 'leaderboards',
    module: LeaderboardsModule,
    exports: [],
    providers: [LeaderboardsService],
  },
  {
    name: 'interactions',
    module: InteractionsModule,
    exports: [COMMENT_COUNT_READER, INTERACTION_POLICY_REGISTRATIONS],
    providers: [
      BookmarksService,
      CommentDraftsService,
      CommentsService,
      InteractionTargetsService,
      ReactionsService,
      AudienceEngagementService,
      ModerationService,
    ],
  },
])('$name public boundary', (boundary) => {
  it('exports only its reviewed Nest integration tokens', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, boundary.module) ?? [],
    ).toEqual(boundary.exports);
  });

  it('publishes named contracts without application-service re-exports', () => {
    const source = createSourceFile(
      'index.ts',
      readFileSync(
        join(__dirname, '../modules', boundary.name, 'index.ts'),
        'utf8',
      ),
      ScriptTarget.Latest,
    );
    const declarations = source.statements.filter(isExportDeclaration);
    expect(declarations.length).toBeGreaterThan(0);
    for (const declaration of declarations) {
      expect(
        declaration.exportClause && isNamedExports(declaration.exportClause),
      ).toBe(true);
      expect(declaration.moduleSpecifier?.getText(source)).not.toContain(
        '/application/',
      );
    }
  });

  it('retains local application providers for existing resolvers', () => {
    const providers: unknown = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      boundary.module,
    );
    for (const provider of boundary.providers) {
      expect(providers).toContain(provider);
    }
  });
});
