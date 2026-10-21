/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Library Composition
 * 📄 File: apps/api/src/composition/media-library/media-library-composition.module.ts
 *
 * 🎯 Purpose:
 * Binds only the profile-aware Media persistence token from root assembly.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { MEDIA_LIBRARY_PERSISTENCE, MediaModule } from '@api/modules/media';
import { PrismaProfileAwareMediaLibrary } from './infrastructure/prisma-profile-aware-media-library';

@Global()
@Module({
  imports: [PrismaModule, MediaModule],
  providers: [
    {
      provide: MEDIA_LIBRARY_PERSISTENCE,
      useClass: PrismaProfileAwareMediaLibrary,
    },
  ],
  exports: [MEDIA_LIBRARY_PERSISTENCE],
})
export class MediaLibraryCompositionModule {}
