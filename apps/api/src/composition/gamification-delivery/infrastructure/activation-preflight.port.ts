/** Technical root capability executed inside the control transaction. */
import type { TransactionClient } from '@api/core/database';
export const GAMIFICATION_ACTIVATION_PREFLIGHT = Symbol(
  'GAMIFICATION_ACTIVATION_PREFLIGHT',
);
export interface ActivationPreflight {
  assert(transaction: TransactionClient): Promise<void>;
}
