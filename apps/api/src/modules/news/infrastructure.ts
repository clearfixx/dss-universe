/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Persistence Composition
 * 📄 File: apps/api/src/modules/news/infrastructure.ts
 *
 * 🎯 Purpose:
 * Publishes only News-owned technical readers for guarded root snapshot composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export {
  PrismaNewsDeliveryRepository,
  type NewsDeliveryContent,
} from './infrastructure/repositories/prisma-news-delivery.repository';
export { PrismaNewsSearchSession } from './infrastructure/repositories/prisma-news-search.session';
