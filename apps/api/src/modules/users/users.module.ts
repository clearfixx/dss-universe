import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { USERS_REPOSITORY } from './interfaces/users.repository.interface';
import { PrismaUsersRepository } from './repositories/prisma-users.repository';

@Module({
  providers: [
    UsersService,
    {
      provide: USERS_REPOSITORY,
      useClass: PrismaUsersRepository,
    },
  ],
  exports: [UsersService, USERS_REPOSITORY],
})
export class UsersModule {}
