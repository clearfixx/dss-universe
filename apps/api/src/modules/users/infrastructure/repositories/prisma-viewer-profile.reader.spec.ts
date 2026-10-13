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
import type { PrismaService } from '@api/core/database';
import { PrismaViewerProfileReader } from './prisma-viewer-profile.reader';

describe('PrismaViewerProfileReader', () => {
  const findUnique = jest.fn();
  const reader = new PrismaViewerProfileReader({
    user: { findUnique },
  } as unknown as PrismaService);
  beforeEach(() => jest.resetAllMocks());
  it('selects only the sixteen viewer fields and does not trust an overbroad row', async () => {
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
    findUnique.mockResolvedValue({
      ...profile,
      passwordHash: 'private',
      futureSecret: 'private',
    });
    await expect(reader.findById('subject')).resolves.toEqual(profile);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'subject' },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        location: true,
        website: true,
        technologies: true,
        interests: true,
        avatarUrl: true,
        coverUrl: true,
        status: true,
        emailVerifiedAt: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });
  it('returns no profile for a missing subject', async () => {
    findUnique.mockResolvedValue(null);
    await expect(reader.findById('missing')).resolves.toBeNull();
  });
  it('propagates infrastructure failure instead of inventing a profile', async () => {
    const error = new Error('database unavailable');
    findUnique.mockRejectedValue(error);
    await expect(reader.findById('subject')).rejects.toBe(error);
  });
});
