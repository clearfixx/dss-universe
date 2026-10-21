/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: D4.2 Boundary Verification
 * 📄 File: apps/api/src/composition/profile-assets/application/profile-asset-presentation.service.spec.ts
 *
 * 🎯 Purpose:
 * Pins minimal evidence, owner command sequencing and fail-closed composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ViewerProfile, ViewerProfileReader } from '@api/modules/users';
import type { MediaProfileAssetCommands } from '@api/modules/media';
import { ProfileAssetPresentationService } from './profile-asset-presentation.service';
const profile: ViewerProfile = {
  id: 'subject',
  email: 'pilot@example.test',
  username: 'pilot',
  displayName: null,
  bio: null,
  location: null,
  website: null,
  technologies: [],
  interests: [],
  avatarUrl: null,
  coverUrl: null,
  status: 'ACTIVE',
  emailVerifiedAt: null,
  lastSeenAt: null,
  createdAt: new Date('2020-01-01'),
  updatedAt: new Date('2020-01-01'),
};
describe('ProfileAssetPresentationService', () => {
  const media = {
    assignAvatar: jest.fn(),
    removeAvatar: jest.fn(),
    assignCover: jest.fn(),
    removeCover: jest.fn(),
  } satisfies jest.Mocked<MediaProfileAssetCommands>;
  const profiles = {
    findById: jest.fn(),
  } satisfies jest.Mocked<ViewerProfileReader>;
  const service = new ProfileAssetPresentationService(media, profiles);
  beforeEach(() => {
    jest.resetAllMocks();
    profiles.findById.mockResolvedValue(profile);
  });
  const commands: Array<
    [keyof MediaProfileAssetCommands, () => Promise<ViewerProfile>, string[]]
  > = [
    [
      'assignAvatar',
      () => service.assignAvatar('subject', 'media'),
      ['subject', 'media'],
    ],
    ['removeAvatar', () => service.removeAvatar('subject'), ['subject']],
    [
      'assignCover',
      () => service.assignCover('subject', 'media'),
      ['subject', 'media'],
    ],
    ['removeCover', () => service.removeCover('subject'), ['subject']],
  ];
  it.each(commands)(
    'composes %s from a validated Media command and owned profile projection',
    async (name, run, args) => {
      expect(await run()).toEqual(profile);
      expect(media[name].mock.calls).toEqual([args]);
      expect(profiles.findById.mock.calls).toEqual([['subject']]);
      expect(media[name].mock.invocationCallOrder[0]).toBeLessThan(
        profiles.findById.mock.invocationCallOrder[0],
      );
    },
  );
  it('does not read presentation after a denied Media command', async () => {
    media.assignAvatar.mockRejectedValue(new Error('Media denied'));
    await expect(service.assignAvatar('subject', 'media')).rejects.toThrow(
      'Media denied',
    );
    expect(profiles.findById.mock.calls).toHaveLength(0);
  });
  it.each([null, { ...profile, id: 'other' }])(
    'refuses missing or mismatched presentation',
    async (value) => {
      profiles.findById.mockResolvedValue(value);
      await expect(service.removeAvatar('subject')).rejects.toThrow(
        'User not found',
      );
    },
  );
});
