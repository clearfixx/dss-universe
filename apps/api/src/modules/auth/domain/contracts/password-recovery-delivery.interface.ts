/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/contracts/password-recovery-delivery.interface.ts
 *
 * 🎯 Purpose:
 * Limits delivery requests to the owned versioned non-credential payload.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PasswordRecoveryJob } from '@dss/jobs';

export interface PasswordRecoveryDelivery {
  enqueue(request: Readonly<PasswordRecoveryJob>): Promise<void>;
}
export const PASSWORD_RECOVERY_DELIVERY = Symbol('PASSWORD_RECOVERY_DELIVERY');
