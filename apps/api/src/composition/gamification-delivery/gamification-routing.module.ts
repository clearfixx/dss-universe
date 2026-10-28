/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Composition
 * 📄 File: apps/api/src/composition/gamification-delivery/gamification-routing.module.ts
 * 🎯 Purpose: Assembles explicitly invoked persistence behind narrow immutable capabilities.
 * 🧠 Responsibilities: Binds shared database/audit infrastructure without starting work.
 * 🏗️ Architecture: Headless root composition; no feature or queue imports.
 * ⚠️ Important: This module is not imported by AppModule or an automatic runner.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { AuditModule } from '@api/core/audit';
import {
  GAMIFICATION_ROUTING_CONTROL,
  GAMIFICATION_ROUTING_DISCOVERY,
  GAMIFICATION_ROUTING_PUBLICATION,
} from './contracts/routing.constants';
import type {
  RoutingControl,
  RoutingDiscovery,
  RoutingPublication,
} from './contracts/routing.types';
import { PrismaRoutingControlRepository } from './infrastructure/prisma-routing-control.repository';
import { PrismaRoutingDiscoveryRepository } from './infrastructure/prisma-routing-discovery.repository';
import { PrismaRoutingPublicationRepository } from './infrastructure/prisma-routing-publication.repository';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [
    PrismaRoutingControlRepository,
    PrismaRoutingDiscoveryRepository,
    PrismaRoutingPublicationRepository,
    {
      provide: GAMIFICATION_ROUTING_CONTROL,
      inject: [PrismaRoutingControlRepository],
      useFactory: (
        repository: PrismaRoutingControlRepository,
      ): RoutingControl =>
        Object.freeze({
          prepare: (...args: Parameters<RoutingControl['prepare']>) =>
            repository.prepare(...args),
          activate: (...args: Parameters<RoutingControl['activate']>) =>
            repository.activate(...args),
          setPaused: (...args: Parameters<RoutingControl['setPaused']>) =>
            repository.setPaused(...args),
        }),
    },
    {
      provide: GAMIFICATION_ROUTING_DISCOVERY,
      inject: [PrismaRoutingDiscoveryRepository],
      useFactory: (
        repository: PrismaRoutingDiscoveryRepository,
      ): RoutingDiscovery =>
        Object.freeze({
          forward: (...args: Parameters<RoutingDiscovery['forward']>) =>
            repository.forward(...args),
          reconcile: (...args: Parameters<RoutingDiscovery['reconcile']>) =>
            repository.reconcile(...args),
        }),
    },
    {
      provide: GAMIFICATION_ROUTING_PUBLICATION,
      inject: [PrismaRoutingPublicationRepository],
      useFactory: (
        repository: PrismaRoutingPublicationRepository,
      ): RoutingPublication =>
        Object.freeze({
          claim: (...args: Parameters<RoutingPublication['claim']>) =>
            repository.claim(...args),
          acknowledge: (
            ...args: Parameters<RoutingPublication['acknowledge']>
          ) => repository.acknowledge(...args),
          fail: (...args: Parameters<RoutingPublication['fail']>) =>
            repository.fail(...args),
          recover: (...args: Parameters<RoutingPublication['recover']>) =>
            repository.recover(...args),
        }),
    },
  ],
  exports: [
    GAMIFICATION_ROUTING_CONTROL,
    GAMIFICATION_ROUTING_DISCOVERY,
    GAMIFICATION_ROUTING_PUBLICATION,
  ],
})
export class GamificationRoutingModule {}

/** The launch switch is still behind glass. These are only the circuit boards. */
