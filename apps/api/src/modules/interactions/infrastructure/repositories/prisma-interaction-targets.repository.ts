/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/infrastructure/repositories/prisma-interaction-targets.repository.ts
 *
 * 🎯 Purpose:
 * Reads canonical interaction targets from Prisma.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { PrismaService } from '@api/core/database';

import type { InteractionTargetsRepository } from '../../domain/repositories/interaction-targets.repository.interface';
import type { InteractionTarget } from '../../domain/types/interaction-target.type';

@Injectable()
export class PrismaInteractionTargetsRepository implements InteractionTargetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<InteractionTarget | null> {
    return this.prisma.interactionTarget.findUnique({ where: { id } });
  }
}

/**
 * One lookup, one canonical coordinate, considerably fewer polymorphic ghosts.
 */
