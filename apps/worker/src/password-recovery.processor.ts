import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import type { PasswordRecoveryJob } from "@dss/jobs";

export type RecoveryMail = { to: string; subject: string; text: string };

export function createPasswordRecoveryProcessor(
  pool: Pool,
  send: (mail: RecoveryMail) => Promise<unknown>,
  webUrl: string,
) {
  return async ({ data }: { data: PasswordRecoveryJob }): Promise<void> => {
    const requestedAt = new Date(data.requestedAt);
    if (
      !Number.isFinite(requestedAt.getTime()) ||
      Date.now() - requestedAt.getTime() > 30 * 60_000
    )
      return;
    const url = new URL(webUrl);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname)
        ))
    ) {
      throw new Error("Invalid password recovery web URL configuration");
    }
    const token = randomBytes(32).toString("hex");
    const digest = createHash("sha256").update(token).digest("hex");
    const client = await pool.connect();
    let recipient: string | undefined;
    try {
      await client.query("BEGIN");
      const users = await client.query<{
        id: string;
        email: string;
        authVersion: number;
      }>(
        `SELECT id, email, "authVersion" FROM users WHERE email = $1 AND status = 'ACTIVE' FOR UPDATE`,
        [data.email],
      );
      const user = users.rows[0];
      if (user) {
        // Retries replace the previous credential; raw tokens never enter Redis,
        // database records, job results, audit events or application logs.
        const inserted = await client.query(
          `INSERT INTO password_resets ("userId", "tokenHash", "authVersion", "expiresAt", "createdAt")
           VALUES ($1, $2, $3, NOW() + INTERVAL '30 minutes', $4)
           ON CONFLICT ("userId") DO UPDATE SET "tokenHash" = EXCLUDED."tokenHash", "authVersion" = EXCLUDED."authVersion", "expiresAt" = EXCLUDED."expiresAt", "createdAt" = EXCLUDED."createdAt"
           WHERE password_resets."createdAt" <= EXCLUDED."createdAt"
           RETURNING "userId"`,
          [user.id, digest, user.authVersion, requestedAt],
        );
        if (inserted.rowCount) recipient = user.email;
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    if (!recipient) return;
    // A fragment avoids credentials in server access logs and referrer URLs.
    url.hash = `token=${token}`;
    try {
      await send({
        to: recipient,
        subject: "Reset your DSS Universe password",
        text: `A password reset was requested for your DSS Universe account.\n\nChoose a new password: ${url.toString()}\n\nThis link expires in 30 minutes and works once. After resetting, sign in again on your devices. If you did not request this, ignore this email.\n\nBuild. Share. Inspire.\nDSS Universe`,
      });
    } catch {
      // BullMQ persists errors for retries. Never retain provider response bodies.
      throw new Error("Password recovery email delivery failed");
    }
  };
}
