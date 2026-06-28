import { Global, Module } from '@nestjs/common';

import { prismaClientOptionsProvider } from './providers/prisma.provider';
import { PrismaService } from './services/prisma.service';

@Global()
@Module({
  providers: [prismaClientOptionsProvider, PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
