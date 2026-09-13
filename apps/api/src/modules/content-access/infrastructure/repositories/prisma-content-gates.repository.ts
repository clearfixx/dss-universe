/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/infrastructure/repositories/prisma-content-gates.repository.ts
 *
 * 🎯 Purpose:
 * Persists Content Gates and projects global viewer eligibility facts.
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

  async viewerFacts(userId: string, now: Date) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!user) return null;
    const [comments, reputation] = await Promise.all([
      this.prisma.comment.count({
        where: { authorId: userId, deletedAt: null },
      }),
      this.prisma.reputationEntry.aggregate({
        where: { recipientId: userId },
        _sum: { value: true },
      }),
    ]);
    return {
      accountAgeDays: Math.max(
        0,
        Math.floor((now.getTime() - user.createdAt.getTime()) / 86_400_000),
      ),
      comments,
      forumPosts: 0,
      publications: 0,
      reputation: reputation._sum.value ?? 0,
      groups: user.roles.map(({ role }) => role.name),
    };
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

/** Zero placeholders are explicit until Forum and publishing ledgers dock here. */
