/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/domain/types/news-full-record.type.ts
 *
 * 🎯 Purpose:
 * Defines the persisted full News projection before application-owned attachment composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { FullNewsItem } from './short-news.type';
export type NewsFullRecord = Omit<FullNewsItem, 'attachments'>;
