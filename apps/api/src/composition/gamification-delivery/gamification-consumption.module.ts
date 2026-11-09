/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Consumption Composition
 * 📄 File: apps/api/src/composition/gamification-delivery/gamification-consumption.module.ts
 * 🎯 Purpose: Assembles inactive admission/consumption persistence behind named capabilities.
 * 🧠 Responsibilities: Shares infrastructure readers while keeping repositories private.
 * 🏗️ Architecture: Headless root module; no feature application, API route or runner.
 * ⚠️ Important: Not imported by AppModule; configuration belongs to the invoking host.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { EventsModule } from '@api/core/events';
import { ReputationQualificationReadModule } from '../reputation/reputation-qualification-read.module';
import {
  GAMIFICATION_ADMISSION,
  GAMIFICATION_CONSUMPTION,
} from './contracts/consumption.constants';
import type {
  GamificationAdmission,
  GamificationConsumption,
} from './contracts/consumption.types';
import { PrismaAdmissionRepository } from './infrastructure/prisma-admission.repository';
import { PrismaConsumptionRepository } from './infrastructure/prisma-consumption.repository';

@Module({
  imports: [PrismaModule, EventsModule, ReputationQualificationReadModule],
  providers: [
    PrismaAdmissionRepository,
    PrismaConsumptionRepository,
    {
      provide: GAMIFICATION_ADMISSION,
      inject: [PrismaAdmissionRepository],
      useFactory: (
        repository: PrismaAdmissionRepository,
      ): GamificationAdmission =>
        Object.freeze({
          prepare: (...args: Parameters<GamificationAdmission['prepare']>) =>
            repository.prepare(...args),
          rejectAdmission: (
            ...args: Parameters<GamificationAdmission['rejectAdmission']>
          ) => repository.rejectAdmission(...args),
        }),
    },
    {
      provide: GAMIFICATION_CONSUMPTION,
      inject: [PrismaConsumptionRepository],
      useFactory: (
        repository: PrismaConsumptionRepository,
      ): GamificationConsumption =>
        Object.freeze({
          claim: (...args: Parameters<GamificationConsumption['claim']>) =>
            repository.claim(...args),
          load: (...args: Parameters<GamificationConsumption['load']>) =>
            repository.load(...args),
          completeOwner: (
            ...args: Parameters<GamificationConsumption['completeOwner']>
          ) => repository.completeOwner(...args),
          continueOwner: (
            ...args: Parameters<GamificationConsumption['continueOwner']>
          ) => repository.continueOwner(...args),
          block: (...args: Parameters<GamificationConsumption['block']>) =>
            repository.block(...args),
          fail: (...args: Parameters<GamificationConsumption['fail']>) =>
            repository.fail(...args),
          recover: (...args: Parameters<GamificationConsumption['recover']>) =>
            repository.recover(...args),
        }),
    },
  ],
  exports: [GAMIFICATION_ADMISSION, GAMIFICATION_CONSUMPTION],
})
export class GamificationConsumptionModule {}
