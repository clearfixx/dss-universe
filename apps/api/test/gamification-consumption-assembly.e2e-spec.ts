/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Consumption Assembly Verification
 * 📄 File: apps/api/test/gamification-consumption-assembly.e2e-spec.ts
 * 🎯 Purpose: Proves headless inactivity and shared API/read-adapter identity.
 * 🧠 Responsibilities: Exercises real Nest init/close without a queue or activation.
 * 🏗️ Architecture: Migrated disposable fixture and real provider graphs.
 * ⚠️ Important: Hosting the persistence capability does not authorize automatic awards.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Test } from '@nestjs/testing';
import { ModulesContainer } from '@nestjs/core';
import { ConfigurationModule } from '@api/core/config';
import { PrismaService } from '@api/core/database';
import { AppModule } from '../src/app.module';
import { ReputationQualificationAdapter } from '../src/composition/reputation/infrastructure/reputation-qualification.adapter';
import { ReputationQualificationReadModule } from '../src/composition/reputation/reputation-qualification-read.module';
import { GamificationConsumptionModule } from '../src/composition/gamification-delivery/gamification-consumption.module';
import {
  GAMIFICATION_ADMISSION,
  GAMIFICATION_CONSUMPTION,
} from '../src/composition/gamification-delivery/contracts/consumption.constants';
import type {
  GamificationAdmission,
  GamificationConsumption,
} from '../src/composition/gamification-delivery/contracts/consumption.types';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Inactive consumption provider assembly', () => {
  it('initializes a controller-free headless graph without creating work', async () => {
    const fixture = await createIsolatedApiSchemaFixture();
    const context = await Test.createTestingModule({
      imports: [ConfigurationModule, GamificationConsumptionModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    try {
      await context.init();
      const admission = context.get<GamificationAdmission>(
        GAMIFICATION_ADMISSION,
      );
      const consumption = context.get<GamificationConsumption>(
        GAMIFICATION_CONSUMPTION,
      );
      expect(Object.isFrozen(admission)).toBe(true);
      expect(Object.isFrozen(consumption)).toBe(true);
      expect(await consumption.claim()).toEqual([]);
      expect(await consumption.recover()).toBe(0);
      expect(await fixture.prisma.gamificationActivation.count()).toBe(0);
      expect(await fixture.prisma.gamificationAdmission.count()).toBe(0);
      expect(await fixture.prisma.communityPointEntry.count()).toBe(0);
      const modules = context.get(ModulesContainer);
      expect(
        [...modules.values()].reduce(
          (count, module) => count + module.controllers.size,
          0,
        ),
      ).toBe(0);
    } finally {
      try {
        await context.close();
      } finally {
        await fixture.close();
      }
    }
  }, 60000);

  it('shares one qualification reader assembly with an API host', async () => {
    const fixture = await createIsolatedApiSchemaFixture();
    const context = await Test.createTestingModule({
      imports: [AppModule, GamificationConsumptionModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    const app = context.createNestApplication();
    try {
      await app.init();
      const adapter = app.get(ReputationQualificationAdapter);
      expect(
        context
          .select(ReputationQualificationReadModule)
          .get(ReputationQualificationAdapter, { strict: true }),
      ).toBe(adapter);
      const modules = context.get(ModulesContainer);
      const registrations = [...modules.values()]
        .flatMap((module) => [...module.providers.values()])
        .filter(
          (provider) => provider.metatype === ReputationQualificationAdapter,
        );
      expect(registrations).toHaveLength(1);
      expect(await fixture.prisma.gamificationActivation.count()).toBe(0);
      expect(app.get<GamificationConsumption>(GAMIFICATION_CONSUMPTION)).toBe(
        context.get(GAMIFICATION_CONSUMPTION),
      );
    } finally {
      try {
        await app.close();
      } finally {
        await fixture.close();
      }
    }
  }, 60000);
});
