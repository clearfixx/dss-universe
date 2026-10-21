/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-viewer-profile.reader.spec.ts
 *
 * 🎯 Purpose:
 * Verifies exact viewer projection and denial of future persistence secrets.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { UsersProfilePersistence } from '../../contracts/profile-persistence.port';
import { PrismaViewerProfileReader } from './prisma-viewer-profile.reader';

describe('PrismaViewerProfileReader', () => {
  const findById = jest.fn();
  const reader = new PrismaViewerProfileReader({
    findById,
  } as unknown as UsersProfilePersistence);
  beforeEach(() => jest.resetAllMocks());
  it('copies only the sixteen viewer fields and does not trust an overbroad provider', async () => {
    const profile = {
      id: 'subject',
      email: 'pilot@dss.test',
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    findById.mockResolvedValue({
      ...profile,
      passwordHash: 'private',
      futureSecret: 'private',
    });
    await expect(reader.findById('subject')).resolves.toEqual(profile);
    expect(findById).toHaveBeenCalledWith('subject');
  });
  it('returns no profile for a missing subject', async () => {
    findById.mockResolvedValue(null);
    await expect(reader.findById('missing')).resolves.toBeNull();
  });
  it('propagates infrastructure failure instead of inventing a profile', async () => {
    const error = new Error('database unavailable');
    findById.mockRejectedValue(error);
    await expect(reader.findById('subject')).rejects.toBe(error);
  });
});
