/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/user-social-links.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies normalized and duplicate-safe profile social-link replacement.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BadRequestException } from '@nestjs/common';

import type { UserSocialLinksRepository } from '../../domain/repositories/user-social-links.repository.interface';
import { UserSocialLinksService } from './user-social-links.service';

describe('UserSocialLinksService', () => {
  const replaceForUser = jest.fn<
    ReturnType<UserSocialLinksRepository['replaceForUser']>,
    Parameters<UserSocialLinksRepository['replaceForUser']>
  >();
  const repository = {
    findByUserIds: jest.fn(),
    replaceForUser,
  } as jest.Mocked<UserSocialLinksRepository>;
  const service = new UserSocialLinksService(repository);

  beforeEach(() => {
    jest.resetAllMocks();
    replaceForUser.mockResolvedValue([]);
  });

  it('normalizes platforms, labels, URLs, and stable positions', async () => {
    await service.replace('user-1', [
      {
        platform: ' GitHub ',
        label: ' Open Source ',
        url: ' https://github.com/dss ',
      },
      { platform: 'LinkedIn', url: 'https://linkedin.com/in/dss' },
    ]);
    expect(replaceForUser).toHaveBeenCalledWith('user-1', [
      {
        platform: 'github',
        label: 'Open Source',
        url: 'https://github.com/dss',
        position: 0,
      },
      {
        platform: 'linkedin',
        label: null,
        url: 'https://linkedin.com/in/dss',
        position: 1,
      },
    ]);
  });

  it('rejects duplicate platforms case-insensitively', () => {
    expect(() =>
      service.replace('user-1', [
        { platform: 'GitHub', url: 'https://github.com/one' },
        { platform: 'github', url: 'https://github.com/two' },
      ]),
    ).toThrow(BadRequestException);
    expect(replaceForUser).not.toHaveBeenCalled();
  });
});
