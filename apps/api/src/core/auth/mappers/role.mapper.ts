import { UserRole } from '@prisma/client';

import { Role } from '../enums/role.enum';

export class RoleMapper {
  static toCore(role: UserRole): Role {
    switch (role) {
      case UserRole.USER:
        return Role.USER;

      case UserRole.MODERATOR:
        return Role.MODERATOR;

      case UserRole.ADMIN:
        return Role.ADMIN;

      case UserRole.OWNER:
        return Role.OWNER;
    }
  }
}

