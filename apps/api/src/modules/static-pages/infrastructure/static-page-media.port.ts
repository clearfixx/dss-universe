/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Static Pages
 * 📄 File: apps/api/src/modules/static-pages/infrastructure/static-page-media.port.ts
 *
 * 🎯 Purpose:
 * What static pages need from the file owner: may this actor attach these
 * files, and keep references so retention does not delete them.
 *
 * ⚠️ Important:
 * Root composition implements it; the reference write joins the page's
 * transaction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { TransactionClient } from '@api/core/database';

export const STATIC_PAGE_MEDIA = Symbol('STATIC_PAGE_MEDIA');
export const STATIC_PAGE_MEDIA_PURPOSE = 'static-page';

export interface StaticPageMedia {
  referencedIds(pageId: string): Promise<string[]>;
  /** How many of these files the actor may not attach. */
  rejectedCount(actorId: string, mediaIds: readonly string[]): Promise<number>;
  sync(
    transaction: TransactionClient,
    pageId: string,
    actorId: string,
    mediaIds: readonly string[],
  ): Promise<void>;
}
