/** Conditional root policy for represented producer inputs; no scoring policy. */
import { Global, Injectable, Module } from '@nestjs/common';
import type { TransactionClient } from '@api/core/database';
import {
  POINT_RULE_DELIVERY_GUARD,
  type PointRuleDeliveryGuard,
  PointRuleDeliveryConfigurationError,
} from '@api/modules/community-points/infrastructure';
import {
  ACHIEVEMENT_RULE_DELIVERY_GUARD,
  type AchievementRuleDeliveryGuard,
  AchievementRuleDeliveryConfigurationError,
} from '@api/modules/achievements/infrastructure';
import {
  DORMANT_POINT_EVENTS,
  profileForEvent,
} from './contracts/producer-catalog';
import { GAMIFICATION_DESTINATION } from './contracts/routing.constants';
import { lockGamificationConfiguration } from './infrastructure/configuration-lock';

async function active(transaction: TransactionClient): Promise<boolean> {
  await lockGamificationConfiguration(transaction, false);
  const [row] = await transaction.$queryRaw<{ state: string }[]>`
    SELECT state FROM gamification_activations WHERE destination=${GAMIFICATION_DESTINATION} FOR SHARE`;
  return row?.state === 'ACTIVE' || row?.state === 'PAUSED';
}
export function representedPointRule(eventName: string): boolean {
  return (
    profileForEvent(eventName)?.points === true ||
    (DORMANT_POINT_EVENTS as readonly string[]).includes(eventName)
  );
}
export function representedAchievementRule(
  eventName: string,
  recipientPayloadKey: string,
): boolean {
  const p = profileForEvent(eventName);
  return p
    ? (p.recipients as readonly string[]).includes(recipientPayloadKey)
    : (DORMANT_POINT_EVENTS as readonly string[]).includes(eventName) &&
        recipientPayloadKey === 'authorId';
}

@Injectable()
export class PointRuleConfigurationAdapter implements PointRuleDeliveryGuard {
  async assert(
    transaction: TransactionClient,
    proposal: Parameters<PointRuleDeliveryGuard['assert']>[1],
  ): Promise<void> {
    if (
      !(await active(transaction)) ||
      !proposal.enabled ||
      representedPointRule(proposal.eventName)
    )
      return;
    throw new PointRuleDeliveryConfigurationError();
  }
}
@Injectable()
export class AchievementRuleConfigurationAdapter implements AchievementRuleDeliveryGuard {
  async assert(
    transaction: TransactionClient,
    proposal: Parameters<AchievementRuleDeliveryGuard['assert']>[1],
  ): Promise<void> {
    if (
      !(await active(transaction)) ||
      !proposal.enabled ||
      representedAchievementRule(
        proposal.eventName,
        proposal.recipientPayloadKey,
      )
    )
      return;
    throw new AchievementRuleDeliveryConfigurationError();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: POINT_RULE_DELIVERY_GUARD,
      useClass: PointRuleConfigurationAdapter,
    },
    {
      provide: ACHIEVEMENT_RULE_DELIVERY_GUARD,
      useClass: AchievementRuleConfigurationAdapter,
    },
  ],
  exports: [POINT_RULE_DELIVERY_GUARD, ACHIEVEMENT_RULE_DELIVERY_GUARD],
})
export class GamificationConfigurationModule {}
