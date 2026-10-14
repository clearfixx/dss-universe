/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Maintenance Composition
 * 📄 File: apps/api/scripts/news-search-maintenance.ts
 *
 * 🎯 Purpose:
 * Runs explicit News search readiness/backfill operations without an HTTP endpoint.
 *
 * 🧠 Responsibilities:
 * • validates target/command before loading the application graph or opening connections;
 * • disables unrelated background work and invokes only the published maintenance port;
 * • emits counts or repair-required IDs, never source documents or raw provider errors.
 *
 * 🏗️ Architecture:
 * Operational composition entry point; all search semantics and persistence remain News/Editor-owned.
 *
 * ⚠️ Important:
 * Exit 0 is ready, 2 means remaining work, 1 means failure. Remote execution needs separate approval.
 * The named CommonJS composition loads are deferred until the background switches are set.
 * Use the existing metadata-preserving ts-node/Nodenext configuration, not an esbuild loader.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import type { NewsSearchIndexMaintenance } from '../src/modules/news';
import { parseNewsSearchMaintenanceOptions } from '../src/composition/maintenance/application/news-search-maintenance-options';

async function main() {
  for (const file of ['.env.local', '.env']) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
  const options = parseNewsSearchMaintenanceOptions(
    process.argv.slice(2),
    process.env.DATABASE_URL,
  );
  process.env.OUTBOX_DISPATCH_INTERVAL_MS = '0';
  process.env.MEDIA_CLEANUP_INTERVAL_MS = '0';
  process.env.NEWS_SCHEDULER_INTERVAL_MS = '0';
  const loadModule = createRequire(__filename);
  const { NEWS_SEARCH_INDEX_MAINTENANCE, NewsSearchInvalidSourceError } =
    loadModule('../src/modules/news') as Pick<
      typeof import('../src/modules/news'),
      'NEWS_SEARCH_INDEX_MAINTENANCE' | 'NewsSearchInvalidSourceError'
    >;
  const { AppModule } = loadModule('../src/app.module') as Pick<
    typeof import('../src/app.module'),
    'AppModule'
  >;
  let app: INestApplicationContext | undefined;
  try {
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
      abortOnError: false,
    });
    const maintenance = app.get<NewsSearchIndexMaintenance>(
      NEWS_SEARCH_INDEX_MAINTENANCE,
    );
    const result =
      options.command === 'check'
        ? await maintenance.check()
        : await maintenance.run(options.batchSize);
    process.stdout.write(
      JSON.stringify({
        command: options.command,
        database: options.databaseName,
        ...result,
      }) + '\n',
    );
    if (result.remaining !== 0) process.exitCode = 2;
  } catch (error) {
    if (!(error instanceof NewsSearchInvalidSourceError)) throw error;
    process.stderr.write(
      JSON.stringify({
        code: 'NEWS_SEARCH_INVALID_SOURCE',
        articleId: error.articleId,
      }) + '\n',
    );
    process.exitCode = 1;
  } finally {
    await app?.close();
  }
}

void main().catch(() => {
  process.stderr.write(
    'News search maintenance failed. Check command flags, target configuration and database readiness.\n',
  );
  process.exitCode = 1;
});
