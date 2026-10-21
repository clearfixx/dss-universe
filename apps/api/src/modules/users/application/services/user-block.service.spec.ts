/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Tests
 * 📄 File: apps/api/src/modules/users/application/services/user-block.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies block safety, target validation, and central enforcement delegation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { UserBlockRepository } from '../../domain/repositories/user-block.repository.interface';
import { UserBlockService } from './user-block.service';
import type { UsersService } from './users.service';

describe('UserBlockService', () => {
  const block: jest.MockedFunction<UserBlockRepository['block']> = jest.fn();
  const unblock: jest.MockedFunction<UserBlockRepository['unblock']> =
    jest.fn();
  const existsEitherDirection: jest.MockedFunction<
    UserBlockRepository['existsEitherDirection']
  > = jest.fn();
  const repository = {
    block,
    unblock,
    existsEitherDirection,
  } as unknown as jest.Mocked<UserBlockRepository>;
  const users = {
    exists: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;
  const service = new UserBlockService(repository, users);

  beforeEach(() => jest.clearAllMocks());

  it('rejects self-block without persistence', async () => {
    await expect(service.block('user-1', 'user-1')).rejects.toMatchObject({
      status: 400,
    });
    expect(block).not.toHaveBeenCalled();
  });

  it('rejects a missing block target', async () => {
    users.exists.mockResolvedValue(false);

    await expect(service.block('user-1', 'missing')).rejects.toMatchObject({
      status: 400,
    });
    expect(block).not.toHaveBeenCalled();
  });

  it('delegates a valid block and central block lookup', async () => {
    users.exists.mockResolvedValue(true);
    existsEitherDirection.mockResolvedValue(true);

    await service.block('user-1', 'user-2');

    expect(block).toHaveBeenCalledWith('user-1', 'user-2');
    await expect(service.isBlocked('user-1', 'user-2')).resolves.toBe(true);
  });
});
