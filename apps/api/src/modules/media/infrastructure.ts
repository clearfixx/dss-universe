/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Persistence Composition
 * 📄 File: apps/api/src/modules/media/infrastructure.ts
 *
 * 🎯 Purpose:
 * Publishes fixed Media persistence operations solely for guarded root assembly.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { PrismaMediaLibraryOperations } from './infrastructure/repositories/prisma-media-library.operations';
export { guardReadyPublicProfileMediaForAssignment } from './infrastructure/repositories/prisma-profile-media-write.guard';
