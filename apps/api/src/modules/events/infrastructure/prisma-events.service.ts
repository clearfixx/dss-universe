/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Events
 * 📄 File: apps/api/src/modules/events/infrastructure/prisma-events.service.ts
 *
 * 🎯 Purpose:
 * Staff-managed community events and the public list of upcoming ones.
 *
 * ⚠️ Important:
 * Every write is audited and emits an `events.*.v1` integration event in
 * the same transaction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CommunityEvent as EventRow } from '@prisma/client';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import {
  EVENT_LIMITS,
  isUpcoming,
  validateEvent,
  type CommunityEvent,
  type EventInput,
} from '../domain/event.rules';

const MAX_UPCOMING = 20;

@Injectable()
export class CommunityEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  /** Events that have not finished yet, soonest first. */
  async upcoming(limit = 5, now = new Date()): Promise<CommunityEvent[]> {
    const take = Math.min(Math.max(1, Math.trunc(limit) || 1), MAX_UPCOMING);
    const earliest = new Date(
      now.getTime() - EVENT_LIMITS.durationMaxMinutes * 60_000,
    );
    const rows = await this.prisma.communityEvent.findMany({
      where: { startsAt: { gt: earliest } },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: take + 50,
    });
    return rows
      .map((row) => this.toEvent(row))
      .filter((event) => isUpcoming(event, now))
      .slice(0, take);
  }

  /** Every event, newest first, for staff. */
  async all(): Promise<CommunityEvent[]> {
    const rows = await this.prisma.communityEvent.findMany({
      orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });
    return rows.map((row) => this.toEvent(row));
  }

  async create(actorId: string, input: EventInput): Promise<CommunityEvent> {
    const value = this.valid(input);
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityEvent.create({
        data: { ...value, createdById: actorId },
      });
      await this.record(tx, actorId, created, 'created');
      return created;
    });
    return this.toEvent(row);
  }

  async update(
    actorId: string,
    id: string,
    input: EventInput,
  ): Promise<CommunityEvent> {
    const value = this.valid(input);
    const row = await this.prisma.$transaction(async (tx) => {
      await this.existing(tx, id);
      const updated = await tx.communityEvent.update({
        where: { id },
        data: value,
      });
      await this.record(tx, actorId, updated, 'updated');
      return updated;
    });
    return this.toEvent(row);
  }

  async remove(actorId: string, id: string): Promise<boolean> {
    await this.prisma.$transaction(async (tx) => {
      const row = await this.existing(tx, id);
      await tx.communityEvent.delete({ where: { id } });
      await this.record(tx, actorId, row, 'deleted');
    });
    return true;
  }

  private valid(input: EventInput): EventInput {
    const result = validateEvent(input);
    if (!result.ok) throw new BadRequestException(result.error);
    return result.value;
  }

  private async existing(tx: TransactionClient, id: string) {
    const row = await tx.communityEvent.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Event not found.');
    return row;
  }

  private toEvent(row: EventRow): CommunityEvent {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      startsAt: row.startsAt,
      durationMinutes: row.durationMinutes,
      format: row.format,
      location: row.location,
      url: row.url,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async record(
    tx: TransactionClient,
    actorId: string,
    row: EventRow,
    action: 'created' | 'updated' | 'deleted',
  ): Promise<void> {
    const payload = {
      eventId: row.id,
      title: row.title,
      startsAt: row.startsAt.toISOString(),
      durationMinutes: row.durationMinutes,
      format: row.format,
    };
    await this.audit.append(tx, {
      action: `events.event_${action}`,
      actorType: 'USER',
      actorId,
      targetType: 'CommunityEvent',
      targetId: row.id,
      metadata: payload,
    });
    await this.outbox.append(
      tx,
      createEventEnvelope({
        name: `events.event.${action}.v1`,
        version: 1,
        category: 'integration',
        producer: 'dss.api.events',
        actorId,
        aggregate: { type: 'CommunityEvent', id: row.id },
        payload,
      }),
    );
  }
}
