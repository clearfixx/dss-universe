/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Missions
 * 📄 File: apps/api/src/modules/missions/infrastructure/prisma-missions.service.ts
 *
 * 🎯 Purpose:
 * Staff-managed community missions and each viewer's automatic progress.
 *
 * ⚠️ Important:
 * Every write is audited and emits a `missions.*.v1` integration event in
 * the same transaction. Progress is read through MISSION_METRIC_READER.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CommunityMission } from '@prisma/client';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import {
  MISSION_METRIC_READER,
  type MissionMetricReader,
} from '../contracts/mission-metric.contract';
import {
  progressWindow,
  validateMission,
  type Mission,
  type MissionInput,
} from '../domain/mission.rules';

export type MissionView = Mission & { viewerProgress: number | null };

@Injectable()
export class MissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
    @Inject(MISSION_METRIC_READER)
    private readonly metrics: MissionMetricReader,
  ) {}

  /** Running missions (active, started, not ended) with the viewer's progress. */
  async current(
    viewerId: string | null,
    now = new Date(),
  ): Promise<MissionView[]> {
    const rows = await this.prisma.communityMission.findMany({
      where: { active: true, startsAt: { lte: now }, endsAt: { gt: now } },
      orderBy: [{ endsAt: 'asc' }, { id: 'asc' }],
      take: 10,
    });
    return Promise.all(
      rows.map((row) => this.withProgress(row, viewerId, now)),
    );
  }

  /** Every mission, newest first, for staff. */
  async all(): Promise<MissionView[]> {
    const rows = await this.prisma.communityMission.findMany({
      orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });
    return rows.map((row) => ({
      ...this.toMission(row),
      viewerProgress: null,
    }));
  }

  async create(actorId: string, input: MissionInput): Promise<MissionView> {
    const value = this.valid(input);
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityMission.create({
        data: { ...value, createdById: actorId },
      });
      await this.record(tx, actorId, created, 'created');
      return created;
    });
    return { ...this.toMission(row), viewerProgress: null };
  }

  async update(
    actorId: string,
    id: string,
    input: MissionInput,
  ): Promise<MissionView> {
    const value = this.valid(input);
    const row = await this.prisma.$transaction(async (tx) => {
      await this.existing(tx, id);
      const updated = await tx.communityMission.update({
        where: { id },
        data: value,
      });
      await this.record(tx, actorId, updated, 'updated');
      return updated;
    });
    return { ...this.toMission(row), viewerProgress: null };
  }

  async remove(actorId: string, id: string): Promise<boolean> {
    await this.prisma.$transaction(async (tx) => {
      const row = await this.existing(tx, id);
      await tx.communityMission.delete({ where: { id } });
      await this.record(tx, actorId, row, 'deleted');
    });
    return true;
  }

  private async withProgress(
    row: CommunityMission,
    viewerId: string | null,
    now: Date,
  ): Promise<MissionView> {
    const mission = this.toMission(row);
    const window = progressWindow(mission, now);
    const viewerProgress =
      viewerId === null
        ? null
        : window
          ? Math.max(
              0,
              await this.metrics.progress(
                viewerId,
                mission.metric,
                window.since,
                window.until,
              ),
            )
          : 0;
    return { ...mission, viewerProgress };
  }

  private valid(input: MissionInput): MissionInput {
    const result = validateMission(input);
    if (!result.ok) throw new BadRequestException(result.error);
    return result.value;
  }

  private async existing(tx: TransactionClient, id: string) {
    const row = await tx.communityMission.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Mission not found.');
    return row;
  }

  private toMission(row: CommunityMission): Mission {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      metric: row.metric,
      target: row.target,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      active: row.active,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async record(
    tx: TransactionClient,
    actorId: string,
    row: CommunityMission,
    action: 'created' | 'updated' | 'deleted',
  ): Promise<void> {
    const payload = {
      missionId: row.id,
      title: row.title,
      metric: row.metric,
      target: row.target,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      active: row.active,
    };
    await this.audit.append(tx, {
      action: `missions.mission_${action}`,
      actorType: 'USER',
      actorId,
      targetType: 'CommunityMission',
      targetId: row.id,
      metadata: payload,
    });
    await this.outbox.append(
      tx,
      createEventEnvelope({
        name: `missions.mission.${action}.v1`,
        version: 1,
        category: 'integration',
        producer: 'dss.api.missions',
        actorId,
        aggregate: { type: 'CommunityMission', id: row.id },
        payload,
      }),
    );
  }
}
