/** Technical owner port; transaction lifetime belongs to the existing writer. */
import type { TransactionClient } from '@api/core/database';
export const POINT_RULE_DELIVERY_GUARD = Symbol('POINT_RULE_DELIVERY_GUARD');
export interface PointRuleDeliveryGuard {
  assert(
    transaction: TransactionClient,
    proposal: Readonly<{ eventName: string; enabled: boolean }>,
  ): Promise<void>;
}
