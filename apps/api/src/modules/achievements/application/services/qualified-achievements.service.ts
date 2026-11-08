/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/application/services/qualified-achievements.service.ts
 * 🎯 Purpose: Reconciles verified source state before applying existing achievement rules.
 * 🧠 Responsibilities: Preserves separate rule transactions, recipient existence and normal durable continuation.
 * 🏗️ Architecture: Private owner application service over owned persistence and an ID-only recipient port.
 * ⚠️ Important: Preparation is inactive until an explicit caller supplies attested facts; no queue starts here.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  ACHIEVEMENT_RECIPIENT_EXISTENCE,
  type AchievementRecipientExistence,
} from '../../contracts/recipient-existence.port';
import { QualificationBlockedError } from '../../domain/errors/qualification-blocked.error';
import { QualificationContinuationRequiredError } from '../../domain/errors/qualification-continuation-required.error';
import {
  ACHIEVEMENTS_REPOSITORY,
  type AchievementsRepository,
} from '../../domain/repositories/achievements.repository.interface';
import {
  QUALIFIED_ACHIEVEMENTS_REPOSITORY,
  type QualifiedAchievementsRepository,
} from '../../domain/repositories/qualified-achievements.repository.interface';
import type {
  AchievementConsumption,
  AchievementEvent,
} from '../../domain/types/achievements.type';
import type {
  QualifiedAchievementCommand,
  QualifiedAchievementOutcome,
} from '../../domain/types/qualified-achievement.type';
import { validateQualifiedAchievementCommand } from './qualified-achievement-validation';

@Injectable()
export class QualifiedAchievementsService {
  constructor(
    @Inject(QUALIFIED_ACHIEVEMENTS_REPOSITORY)
    private readonly qualified: QualifiedAchievementsRepository,
    @Inject(ACHIEVEMENTS_REPOSITORY)
    private readonly achievements: AchievementsRepository,
    @Inject(ACHIEVEMENT_RECIPIENT_EXISTENCE)
    private readonly users: AchievementRecipientExistence,
  ) {}

  async routeLegacy(
    event: AchievementEvent,
    rollback: { sourceType: string; sourceId: string } | null,
  ): Promise<AchievementConsumption[] | null> {
    const resolution = await this.qualified.resolveLegacy(event, rollback);
    if (resolution.status === 'UNENROLLED') return null;
    if (resolution.status === 'BLOCKED')
      throw new QualificationBlockedError('LEGACY_FACT_REQUIRED');
    const result = await this.advance(resolution.command);
    if (result.status === 'BLOCKED')
      throw new QualificationBlockedError(result.code);
    if (result.status === 'CONTINUE')
      throw new QualificationContinuationRequiredError(result.progress);
    return [...result.consumptions];
  }

  async advance(
    command: QualifiedAchievementCommand,
  ): Promise<QualifiedAchievementOutcome> {
    try {
      validateQualifiedAchievementCommand(command);
      const rules = await this.achievements.matchingRules(
        command.event.eventName,
      );
      if (command.contribution === null && rules.length > 0)
        throw new QualificationBlockedError('INVALID_QUALIFICATION');
      await this.qualified.prepare(command);
      const source = await this.qualified.advanceSources(command.facts);
      if (source.status !== 'READY') return source;
      const consumptions: AchievementConsumption[] = [];
      if (command.contribution !== null) {
        const event: AchievementEvent = {
          ...command.event,
          payload: { ...command.event.payload },
          occurredAt: new Date(command.event.occurredAt),
        };
        for (const rule of rules) {
          const recipient =
            Object.hasOwn(event.payload, rule.recipientPayloadKey) &&
            event.payload[rule.recipientPayloadKey];
          if (
            typeof recipient !== 'string' ||
            !recipient ||
            !(await this.users.exists(recipient))
          ) {
            throw new QualificationBlockedError('INVALID_QUALIFICATION');
          }
          const result = await this.qualified.consumeRule(
            command,
            command.contribution,
            rule,
            event,
            recipient,
          );
          if (result.status === 'CONTINUE') return result;
          consumptions.push(result);
        }
      }
      return { status: 'COMPLETE', consumptions, examined: source.examined };
    } catch (error) {
      if (error instanceof QualificationBlockedError)
        return { status: 'BLOCKED', code: error.code, examined: 0 };
      throw error;
    }
  }
}
