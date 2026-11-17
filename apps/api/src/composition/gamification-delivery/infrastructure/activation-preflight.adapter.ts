/** Configuration and schema checks share the exclusive activation transaction.
 * External readiness is established before entering it; no Redis IO under locks.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TransactionClient } from '@api/core/database';
import { PrismaPointRuleConfigurationReader } from '@api/modules/community-points/infrastructure';
import { PrismaAchievementRuleConfigurationReader } from '@api/modules/achievements/infrastructure';
import {
  representedPointRule,
  representedAchievementRule,
} from '../gamification-configuration.module';
import type { ActivationPreflight } from './activation-preflight.port';

@Injectable()
export class ActivationPreflightAdapter implements ActivationPreflight {
  constructor(
    private readonly config: ConfigService,
    private readonly points: PrismaPointRuleConfigurationReader,
    private readonly achievements: PrismaAchievementRuleConfigurationReader,
  ) {}
  async assert(transaction: TransactionClient): Promise<void> {
    if (
      this.config.get<string>('DSS_GAMIFICATION_DEPLOYMENT_CONFIRMED') !== '1'
    )
      throw new Error('DEPLOYMENT_CONFIRMATION_REQUIRED');
    const [facts] = await transaction.$queryRaw<
      { version: number; timezone: string }[]
    >`
      SELECT gamification_runtime_protocol_version() AS version, current_setting('TimeZone') AS timezone`;
    if (facts?.version !== 1) throw new Error('GAMIFICATION_SCHEMA_NOT_READY');
    if (!['UTC', 'Etc/UTC', 'GMT'].includes(facts.timezone))
      throw new Error('DATABASE_TIMEZONE_NOT_UTC');
    const points = await this.points.read(transaction);
    if (points.some((rule) => !representedPointRule(rule.eventName)))
      throw new Error('UNREPRESENTED_POINT_CONFIGURATION');
    const achievements = await this.achievements.read(transaction);
    if (
      achievements.some(
        (rule) =>
          !representedAchievementRule(rule.eventName, rule.recipientPayloadKey),
      )
    )
      throw new Error('UNREPRESENTED_ACHIEVEMENT_CONFIGURATION');
  }
}
