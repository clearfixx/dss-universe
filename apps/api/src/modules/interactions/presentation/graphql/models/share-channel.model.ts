/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/models/share-channel.model.ts
 * 🎯 Purpose: Registers the unchanged share-channel GraphQL wire enum once.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { registerEnumType } from '@nestjs/graphql';

export enum ShareChannelModel {
  FACEBOOK = 'FACEBOOK',
  X = 'X',
  THREADS = 'THREADS',
  INSTAGRAM = 'INSTAGRAM',
  PINTEREST = 'PINTEREST',
  COPY_LINK = 'COPY_LINK',
  PRINT = 'PRINT',
}

registerEnumType(ShareChannelModel, { name: 'ShareChannel' });
