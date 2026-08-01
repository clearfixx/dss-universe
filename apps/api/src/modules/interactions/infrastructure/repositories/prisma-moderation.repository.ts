/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/infrastructure/repositories/prisma-moderation.repository.ts
 *
 * 🎯 Purpose:
 * Persists content reports, annotation history, Audit and Outbox evidence.
 *
 * 🧠 Responsibilities:
 * • commits moderation state and evidence atomically;
 * • provides a stable staff report queue;
 * • preserves revoked and expired public annotations;
 * • publishes identifier-only integration events.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';
import {
  createEventEnvelope,
  type JsonValue,
  OutboxWriterService,
} from '@api/core/events';
import type { PaginatedResult } from '@api/shared';

import type { ModerationRepository } from '../../domain/repositories/moderation.repository.interface';
import type {
  ContentReport,
  ContentReportStatus,
  ModerationAnnotation,
} from '../../domain/types/moderation.type';

const PRODUCER = 'dss.api.interaction-moderation';

@Injectable()
export class PrismaModerationRepository implements ModerationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async createReport(
    input: Parameters<ModerationRepository['createReport']>[0],
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const report = await transaction.contentReport.create({ data: input });
      await this.record(transaction, {
        action: 'content-reports.report.created',
        event: 'content-reports.report.created.v1',
        actorId: input.reporterId,
        targetType: 'ContentReport',
        targetId: report.id,
        aggregateType: 'ContentReport',
        payload: this.reportPayload(report),
        reason: input.reason,
      });
      return report;
    });
  }

  findOpenReport(
    targetId: string,
    commentId: string | null,
    reporterId: string,
  ) {
    return this.prisma.contentReport.findFirst({
      where: {
        interactionTargetId: targetId,
        commentId,
        reporterId,
        status: 'OPEN',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listReports(
    status: ContentReportStatus | null,
    page: number,
    limit: number,
  ) {
    const where = status ? { status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contentReport.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contentReport.count({ where }),
    ]);
    return this.page(items, total, page, limit);
  }

  async reviewReport(
    reportId: string,
    reviewerId: string,
    status: 'RESOLVED' | 'DISMISSED',
    note: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.contentReport.updateMany({
        where: { id: reportId, status: 'OPEN' },
        data: {
          status,
          reviewedById: reviewerId,
          reviewNote: note,
          reviewedAt: new Date(),
        },
      });
      if (result.count === 0) return null;
      const report = await transaction.contentReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      await this.record(transaction, {
        action: 'content-reports.report.reviewed',
        event: 'content-reports.report.reviewed.v1',
        actorId: reviewerId,
        targetType: 'ContentReport',
        targetId: report.id,
        aggregateType: 'ContentReport',
        payload: this.reportPayload(report),
        reason: note,
      });
      return report;
    });
  }

  async createAnnotation(
    input: Parameters<ModerationRepository['createAnnotation']>[0],
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const annotation = await transaction.moderationAnnotation.create({
        data: input,
      });
      await this.record(transaction, {
        action: 'moderation.annotation.created',
        event: 'moderation.annotation.created.v1',
        actorId: input.actorId,
        targetType: 'ModerationAnnotation',
        targetId: annotation.id,
        aggregateType: 'ModerationAnnotation',
        payload: this.annotationPayload(annotation),
        reason: input.reason,
      });
      return annotation;
    });
  }

  listAnnotations(targetId: string, commentId: string | null) {
    return this.prisma.moderationAnnotation.findMany({
      where: { interactionTargetId: targetId, commentId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  async revokeAnnotation(
    annotationId: string,
    actorId: string,
    reason: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.moderationAnnotation.updateMany({
        where: { id: annotationId, revokedAt: null },
        data: {
          revokedAt: new Date(),
          revokedById: actorId,
          revokeReason: reason,
        },
      });
      if (result.count === 0) return null;
      const annotation =
        await transaction.moderationAnnotation.findUniqueOrThrow({
          where: { id: annotationId },
        });
      await this.record(transaction, {
        action: 'moderation.annotation.revoked',
        event: 'moderation.annotation.revoked.v1',
        actorId,
        targetType: 'ModerationAnnotation',
        targetId: annotation.id,
        aggregateType: 'ModerationAnnotation',
        payload: this.annotationPayload(annotation),
        reason,
      });
      return annotation;
    });
  }

  private page<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private reportPayload(report: ContentReport) {
    return {
      reportId: report.id,
      interactionTargetId: report.interactionTargetId,
      commentId: report.commentId,
      reporterId: report.reporterId,
      category: report.category,
      status: report.status,
      reviewedById: report.reviewedById,
    };
  }

  private annotationPayload(annotation: ModerationAnnotation) {
    return {
      annotationId: annotation.id,
      interactionTargetId: annotation.interactionTargetId,
      commentId: annotation.commentId,
      kind: annotation.kind,
      actorId: annotation.actorId,
      expiresAt: annotation.expiresAt?.toISOString() ?? null,
      revokedAt: annotation.revokedAt?.toISOString() ?? null,
      revokedById: annotation.revokedById,
    };
  }

  private async record(
    transaction: Parameters<AuditWriterService['append']>[0],
    input: {
      action: string;
      event: string;
      actorId: string;
      targetType: string;
      targetId: string;
      aggregateType: string;
      payload: JsonValue;
      reason: string;
    },
  ) {
    await this.audit.append(transaction, {
      action: input.action,
      actorType: 'USER',
      actorId: input.actorId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      metadata: input.payload,
    });
    await this.outbox.append(
      transaction,
      createEventEnvelope({
        name: input.event,
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        actorId: input.actorId,
        aggregate: { type: input.aggregateType, id: input.targetId },
        payload: input.payload,
      }),
    );
  }
}

/**
 * Moderation without evidence is just a mysterious lever in Mission Control.
 */
