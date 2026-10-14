/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Asset Composition
 * 📄 File: apps/api/src/composition/profile-assets/profile-asset-composition.module.ts
 *
 * 🎯 Purpose:
 * Wires semantic Media transactions and profile-bearing GraphQL composition.
 *
 * 🧠 Responsibilities:
 * • binds the Media-owned semantic transaction input port;
 * • assembles private application/presentation composition providers;
 * • imports only published owner module boundaries.
 *
 * 🏗️ Architecture:
 * Root composition; a global token supplies wiring, not a broad public facade.
 *
 * ⚠️ Important:
 * Keep the transaction implementation private and the exported token narrow.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { MediaModule, PROFILE_ASSET_TRANSACTION } from '@api/modules/media';
import { UsersModule } from '@api/modules/users';
import { PrismaProfileAssetTransaction } from './infrastructure/prisma-profile-asset.transaction';
import { ProfileAssetPresentationService } from './application/profile-asset-presentation.service';
import { ProfileAssetResolver } from './presentation/graphql/profile-asset.resolver';
@Global()
@Module({
  imports: [MediaModule, UsersModule],
  providers: [
    {
      provide: PROFILE_ASSET_TRANSACTION,
      useClass: PrismaProfileAssetTransaction,
    },
    ProfileAssetPresentationService,
    ProfileAssetResolver,
  ],
  exports: [PROFILE_ASSET_TRANSACTION],
})
export class ProfileAssetCompositionModule {}
