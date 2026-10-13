/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/contracts/email-verification-delivery.interface.ts
 *
 * 🎯 Purpose:
 * Limits delivery requests to the owned versioned non-credential payload.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { EmailVerificationJob } from '@dss/jobs';

export interface EmailVerificationDelivery {
  enqueue(request: Readonly<EmailVerificationJob>): Promise<void>;
}
export const EMAIL_VERIFICATION_DELIVERY = Symbol(
  'EMAIL_VERIFICATION_DELIVERY',
);
