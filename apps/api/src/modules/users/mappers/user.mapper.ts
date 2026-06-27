import { User } from '@prisma/client';
import { SafeUser } from '../types/safe-user.type';

export class UserMapper {
  static toSafeUser(user: User): SafeUser {
    const { passwordHash, ...safeUser } = user;

    return safeUser;
  }
}


