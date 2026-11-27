/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/infrastructure/prisma-community-rules.ts
 *
 * 🎯 Purpose:
 * Community rules catalogue (owner 2026-11-27): administrators keep the
 * numbered points that a permanent ban refers to.
 *
 * ⚠️ Important:
 * Rules are deactivated, never deleted; every change is audited.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma, type CommunityRule } from '@prisma/client';
import { AuditWriterService } from '@api/core/audit';
import { Permission } from '@api/core/authorization';
import { PrismaService, type TransactionClient } from '@api/core/database';
import type { ModerationActor } from '../application/moderation-sanctions.commands';
import {
  compareRuleCodes,
  normalizeRuleCode,
  normalizeRuleText,
} from '../domain/community-rule.rules';
import { ModerationSanctionError } from '../domain/errors/moderation-sanction.error';

export type CommunityRuleRecord = {
  id: string;
  code: string;
  text: string;
  active: boolean;
};

export type CommunityRuleCommand = {
  code: string;
  text: string;
  active: boolean;
};

@Injectable()
export class CommunityRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async list(actor: ModerationActor): Promise<CommunityRuleRecord[]> {
    this.require(actor);
    const rows = await this.prisma.communityRule.findMany();
    return rows
      .map((row) => this.record(row))
      .sort((a, b) => compareRuleCodes(a.code, b.code));
  }

  async create(
    actor: ModerationActor,
    command: CommunityRuleCommand,
  ): Promise<CommunityRuleRecord> {
    this.require(actor);
    const data = this.normalize(command);
    return this.write(async (tx) => {
      const row = await tx.communityRule.create({
        data: { ...data, updatedById: actor.id },
      });
      await this.log(tx, actor.id, 'moderation.rule_created', row.id, {
        next: data,
      });
      return this.record(row);
    });
  }

  async update(
    actor: ModerationActor,
    id: string,
    command: CommunityRuleCommand,
  ): Promise<CommunityRuleRecord> {
    this.require(actor);
    const data = this.normalize(command);
    return this.write(async (tx) => {
      const previous = await tx.communityRule.findUnique({ where: { id } });
      if (!previous)
        throw new ModerationSanctionError('NOT_FOUND', 'Rule not found.');
      const row = await tx.communityRule.update({
        where: { id },
        data: { ...data, updatedById: actor.id },
      });
      await this.log(tx, actor.id, 'moderation.rule_updated', id, {
        previous: this.record(previous),
        next: data,
      });
      return this.record(row);
    });
  }

  private normalize(command: CommunityRuleCommand): CommunityRuleCommand {
    return {
      code: normalizeRuleCode(command.code),
      text: normalizeRuleText(command.text),
      active: command.active,
    };
  }

  private async write<T>(
    work: (tx: TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(work);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ModerationSanctionError(
          'INVALID_STATE',
          'A rule with this number already exists.',
        );
      throw error;
    }
  }

  private log(
    tx: TransactionClient,
    actorId: string,
    action: string,
    targetId: string,
    metadata: Parameters<AuditWriterService['append']>[1]['metadata'],
  ) {
    return this.audit.append(tx, {
      action,
      actorType: 'USER',
      actorId,
      targetType: 'CommunityRule',
      targetId,
      metadata,
    });
  }

  private require(actor: ModerationActor): void {
    if (!actor.permissions.includes(Permission.ModerationRulesManage))
      throw new ModerationSanctionError(
        'ACCESS_DENIED',
        'Community rules are managed by administrators.',
      );
  }

  private record(row: CommunityRule): CommunityRuleRecord {
    return { id: row.id, code: row.code, text: row.text, active: row.active };
  }
}
