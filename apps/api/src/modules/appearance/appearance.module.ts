import { Module } from '@nestjs/common';

import { AuditModule } from '@api/core/audit';
import { AuthorizationModule } from '@api/core/authorization';
import { PrismaModule } from '@api/core/database';

import { AppearanceRepository } from './infrastructure/appearance.repository';
import { APPEARANCE_REPOSITORY } from './domain/appearance.repository.port';
import { AppearanceService } from './appearance.service';
import { AppearanceResolver } from './appearance.graphql';

@Module({
  imports: [PrismaModule, AuditModule, AuthorizationModule],
  providers: [
    { provide: APPEARANCE_REPOSITORY, useClass: AppearanceRepository },
    AppearanceService,
    AppearanceResolver,
  ],
})
export class AppearanceModule {}
