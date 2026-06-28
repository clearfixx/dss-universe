import { Inject, Injectable } from '@nestjs/common';
import { USERS_REPOSITORY } from './interfaces/users.repository.interface';
import type { UsersRepository } from './interfaces/users.repository.interface';
import { UserNotFoundException } from './exceptions/user-not-found.exception';
import { UserMapper } from './mappers/user.mapper';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  async findById(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new UserNotFoundException();
    }

    return UserMapper.toSafeUser(user);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }
}
