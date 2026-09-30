import type { SecurityEmailAlertJob } from "@dss/jobs";
import type { RecoveryMail } from "./password-recovery.processor.js";

const copy = {
  ACCOUNT_LOCKED: {
    subject: "DSS Universe account temporarily locked",
    message:
      "We temporarily locked sign-in after repeated invalid credentials. The lock expires automatically. If this was not you, reset your password before signing in again.",
  },
  PASSWORD_CHANGED: {
    subject: "Your DSS Universe password was changed",
    message:
      "Your DSS Universe password was changed and existing sessions were revoked. If this was not you, begin password recovery immediately.",
  },
  PASSWORD_RECOVERED: {
    subject: "Your DSS Universe password was recovered",
    message:
      "Password recovery completed successfully. The login lock and existing sessions were cleared. If this was not you, contact DSS support immediately.",
  },
  EMAIL_CHANGED: {
    subject: "Your DSS Universe email was changed",
    message:
      "The email address for your DSS Universe account was changed. If this was not you, contact DSS support immediately.",
  },
} as const;

export function createSecurityEmailAlertProcessor(
  send: (mail: RecoveryMail) => Promise<unknown>,
) {
  return async ({ data }: { data: SecurityEmailAlertJob }): Promise<void> => {
    const occurredAt = new Date(data.occurredAt);
    if (!Number.isFinite(occurredAt.getTime())) return;
    const alert = copy[data.kind];
    try {
      await send({
        to: data.email,
        subject: alert.subject,
        text: `${alert.message}\n\nTime: ${occurredAt.toISOString()}\n\nBuild. Share. Inspire.\nDSS Universe`,
      });
    } catch {
      throw new Error("Security email alert delivery failed");
    }
  };
}
