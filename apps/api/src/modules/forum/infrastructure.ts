/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum Persistence Composition
 * 📄 File: apps/api/src/modules/forum/infrastructure.ts
 *
 * 🎯 Purpose:
 * Publishes owned technical readers only for guarded root transaction
 * composition (Community Points admission).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
// Not a business API. Feature consumers and application layers may not import this entry.
export { PrismaForumContributionReader } from './infrastructure/prisma-forum-contribution.reader';
export {
  FORUM_POST_MEDIA,
  FORUM_POST_MEDIA_PURPOSE,
  type ForumPostAttachment,
  type ForumPostMedia,
  type ForumPostMediaRejection,
} from './infrastructure/forum-post-media.port';
