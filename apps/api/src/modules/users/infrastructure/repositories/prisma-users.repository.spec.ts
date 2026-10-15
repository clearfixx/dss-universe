/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-users.repository.spec.ts
 *
 * 🎯 Purpose:
 * Pins safe semantic repository delegation; owned SQL and real filters are tested at root/migrated boundaries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { UsersProfilePersistence } from '../../contracts/profile-persistence.port';
import { PrismaUsersRepository } from './prisma-users.repository';

describe('PrismaUsersRepository semantic delegation', () => {
  it.each([
    ['findById', ['subject']],
    ['findByEmail', ['pilot@dss.test']],
    ['findByUsername', ['pilot']],
    ['findManyByIds', [['subject']]],
    ['findPublicById', ['subject']],
    ['findPublicByUsername', ['pilot']],
    [
      'findMany',
      [{ role: 'MODERATOR', status: 'ACTIVE', sort: 'LAST_ACTIVE' }],
    ],
    ['updateById', ['subject', { displayName: 'Pilot' }]],
  ] as const)(
    'delegates %s without an extra SQL or mapping stage',
    async (name, args) => {
      const result = { synthetic: true };
      const read = jest.fn().mockResolvedValue(result);
      const repository = new PrismaUsersRepository({
        [name]: read,
      } as unknown as UsersProfilePersistence);
      const command = repository[name].bind(repository) as (
        ...values: readonly unknown[]
      ) => Promise<unknown>;
      await expect(command(...args)).resolves.toBe(result);
      expect(read).toHaveBeenCalledWith(...args);
    },
  );
  it('propagates provider failure instead of fabricating a profile', async () => {
    const error = new Error('profile assembly failed');
    const repository = new PrismaUsersRepository({
      findById: jest.fn().mockRejectedValue(error),
    } as unknown as UsersProfilePersistence);
    await expect(repository.findById('subject')).rejects.toBe(error);
  });
});
