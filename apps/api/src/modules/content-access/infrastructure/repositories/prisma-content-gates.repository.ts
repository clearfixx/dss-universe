/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/infrastructure/repositories/prisma-content-gates.repository.ts
 *
 * 🎯 Purpose:
 * Persists owned Content Gate definitions without reading foreign account or ledger tables.
 *
 * 🧠 Responsibilities:
 * • creates and reads gate definitions with their requirements;
 * • maps owned persistence records to domain types.
 *
 * 🏗️ Architecture:
 * Content Access persistence; viewer evidence is composed in its application layer.
 *
 * ⚠️ Important:
 * Do not query Auth, Interactions or Reputation tables from this repository.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import type {
  ContentGate as PrismaContentGate,
  ContentGateRequirement as PrismaRequirement,
} from '@prisma/client';

import { PrismaService } from '@api/core/database';

import type { ContentGatesRepository } from '../../domain/repositories/content-gates.repository.interface';
import type {
  ContentGate,
  CreateContentGate,
} from '../../domain/types/content-gate.type';

type GateRecord = PrismaContentGate & { requirements: PrismaRequirement[] };

@Injectable()
export class PrismaContentGatesRepository implements ContentGatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateContentGate): Promise<ContentGate> {
    const record = await this.prisma.contentGate.create({
      data: {
        ownerId: input.ownerId,
        operator: input.operator,
        requirements: { create: input.requirements },
      },
      include: { requirements: true },
    });
    return this.toDomain(record);
  }

  async findById(id: string): Promise<ContentGate | null> {
    const record = await this.prisma.contentGate.findUnique({
      where: { id },
      include: { requirements: true },
    });
    return record ? this.toDomain(record) : null;
  }

  private toDomain(record: GateRecord): ContentGate {
    return {
      id: record.id,
      ownerId: record.ownerId,
      operator: record.operator,
      requirements: record.requirements.map((requirement) => ({
        id: requirement.id,
        kind: requirement.kind,
        threshold: requirement.threshold,
        groupKey: requirement.groupKey,
      })),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
