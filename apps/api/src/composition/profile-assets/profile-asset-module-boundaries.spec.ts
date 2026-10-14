/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Composition Boundary Tests
 * 📄 File: apps/api/src/composition/profile-assets/profile-asset-module-boundaries.spec.ts
 *
 * 🎯 Purpose:
 * Pins private providers after replacing broad cross-module dependency injection.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import {
  UsersModule,
  USER_BLOCK_DECISIONS,
  PROFILE_EXISTENCE_READER,
  VIEWER_PROFILE_READER,
  PROFILE_DISPLAY_READER,
  PROFILE_WALL_INTERACTION_DECISIONS,
} from '@api/modules/users';
import {
  ReputationModule,
  REPUTATION_TOTAL_READER,
} from '@api/modules/reputation';
import { MediaModule, MEDIA_PROFILE_ASSET_COMMANDS } from '@api/modules/media';
describe('D4.2 provider visibility', () => {
  it('does not export Users/Reputation services or broad avatar/cover implementations', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, UsersModule)).toEqual([
      PROFILE_WALL_INTERACTION_DECISIONS,
      USER_BLOCK_DECISIONS,
      PROFILE_EXISTENCE_READER,
      VIEWER_PROFILE_READER,
      PROFILE_DISPLAY_READER,
    ]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, ReputationModule),
    ).toEqual([REPUTATION_TOTAL_READER]);
    const media = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      MediaModule,
    ) as Array<symbol | { name: string }>;
    expect(media).toContain(MEDIA_PROFILE_ASSET_COMMANDS);
    expect(
      media
        .filter((value) => typeof value !== 'symbol')
        .map((value) => value.name),
    ).not.toContain('AvatarService');
    expect(
      media
        .filter((value) => typeof value !== 'symbol')
        .map((value) => value.name),
    ).not.toContain('CoverService');
  });
});
