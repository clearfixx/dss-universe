/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🤖 Module: AI Core Boundary Tests
 * 📄 File: apps/api/src/modules/ai-core/ai-core-boundary.spec.ts
 *
 * 🎯 Purpose:
 * Pins the explicit module entry and keeps editor inference private to AI Core.
 *
 * 🧠 Responsibilities:
 * • rejects accidental public service and command-type exports;
 * • preserves local resolver/provider wiring without external inference.
 *
 * 🏗️ Architecture:
 * Module metadata and public-entry regression; HTTP behavior has separate E2E coverage.
 *
 * ⚠️ Important:
 * No provider request, credentials or new feature integration belongs here.
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
import { AiCoreModule } from './index';
import { EditorAiService } from './application/services/editor-ai.service';
import { AI_TEXT_PROVIDER } from './application/contracts/ai-text-provider.interface';
import { OpenAiTextProvider } from './infrastructure/providers/openai-text.provider';
import { EditorAiResolver } from './presentation/graphql/editor-ai.graphql';

describe('AI Core public boundary', () => {
  it('publishes only its named assembly module', () => {
    const source = createSourceFile(
      'index.ts',
      readFileSync(join(__dirname, 'index.ts'), 'utf8'),
      ScriptTarget.Latest,
    );
    expect(source.statements).toHaveLength(1);
    expect(
      source.statements.filter(isExportDeclaration).map((declaration) => ({
        module: declaration.moduleSpecifier?.getText(source),
        names:
          declaration.exportClause && isNamedExports(declaration.exportClause)
            ? declaration.exportClause.elements.map(
                (element) => element.name.text,
              )
            : null,
      })),
    ).toEqual([{ module: "'./ai-core.module'", names: ['AiCoreModule'] }]);
  });

  it('does not export the editor command service as a Nest integration API', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, AiCoreModule) ?? [],
    ).toEqual([]);
  });

  it('retains its private resolver, service and provider binding', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AiCoreModule),
    ).toEqual([
      EditorAiService,
      OpenAiTextProvider,
      { provide: AI_TEXT_PROVIDER, useExisting: OpenAiTextProvider },
      EditorAiResolver,
    ]);
  });
});
