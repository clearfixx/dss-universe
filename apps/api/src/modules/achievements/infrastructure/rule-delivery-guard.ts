/** Technical owner port; no ORM type enters a business contract. */
import type { TransactionClient } from '@api/core/database';
export const ACHIEVEMENT_RULE_DELIVERY_GUARD = Symbol(
  'ACHIEVEMENT_RULE_DELIVERY_GUARD',
);
export interface AchievementRuleDeliveryGuard {
  assert(
    transaction: TransactionClient,
    proposal: Readonly<{
      eventName: string;
      recipientPayloadKey: string;
      enabled: boolean;
    }>,
  ): Promise<void>;
}
