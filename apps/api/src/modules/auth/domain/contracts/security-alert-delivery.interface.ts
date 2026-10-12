/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/contracts/security-alert-delivery.interface.ts
 *
 * 🎯 Purpose:
 * Limits Auth alert delivery to its versioned non-credential payload.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { SecurityEmailAlertJob } from '@dss/jobs';

export interface SecurityAlertDelivery {
  enqueue(alert: Readonly<SecurityEmailAlertJob>): Promise<void>;
}
export const SECURITY_ALERT_DELIVERY = Symbol('SECURITY_ALERT_DELIVERY');
