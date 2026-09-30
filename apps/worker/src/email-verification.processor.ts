import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import type { EmailVerificationJob } from "@dss/jobs";
import type { RecoveryMail } from "./password-recovery.processor.js";

export function createEmailVerificationProcessor(
  pool: Pool,
  send: (mail: RecoveryMail) => Promise<unknown>,
  webUrl: string,
) {
  return async ({ data }: { data: EmailVerificationJob }): Promise<void> => {
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
    )
      throw new Error("Invalid email verification web URL configuration");

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const client = await pool.connect();
    let recipient: string | undefined;
    try {
      await client.query("BEGIN");
      const result = await client.query<{ id: string; email: string }>(
        `SELECT id, email FROM users WHERE id = $1 AND email = $2 AND status = 'ACTIVE' AND "emailVerifiedAt" IS NULL FOR UPDATE`,
        [data.userId, data.email],
      );
      const user = result.rows[0];
      if (user) {
        const inserted = await client.query(
          `INSERT INTO email_verifications ("userId", "tokenHash", "expiresAt", "createdAt")
           VALUES ($1, $2, NOW() + INTERVAL '24 hours', $3)
           ON CONFLICT ("userId") DO UPDATE SET "tokenHash" = EXCLUDED."tokenHash", "expiresAt" = EXCLUDED."expiresAt", "createdAt" = EXCLUDED."createdAt"
           WHERE email_verifications."createdAt" <= EXCLUDED."createdAt"
           RETURNING "userId"`,
          [user.id, tokenHash, requestedAt],
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
    url.hash = `token=${token}`;
    try {
      await send({
        to: recipient,
        subject: "Verify your DSS Universe email",
        text: `Confirm your DSS Universe email: ${url.toString()}\n\nThis link expires in 24 hours and works once. If you did not create this account, ignore this email.\n\nBuild. Share. Inspire.\nDSS Universe`,
      });
    } catch {
      throw new Error("Email verification delivery failed");
    }
  };
}
