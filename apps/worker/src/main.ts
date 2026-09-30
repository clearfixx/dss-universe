import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { Pool } from "pg";
import pino from "pino";
import nodemailer from "nodemailer";
import { createPasswordRecoveryProcessor } from "./password-recovery.processor.js";
import { createEmailVerificationProcessor } from "./email-verification.processor.js";
import {
  DSS_QUEUE_NAMES,
  type DeadLetterIntegrationEventJob,
  type IntegrationEventJob,
  type MediaProcessingJob,
  type PasswordRecoveryJob,
  type EmailVerificationJob,
} from "@dss/jobs";
import { DeadLetterService } from "./dead-letter.service.js";
import { createIntegrationEventProcessor } from "./integration-event.processor.js";
import { PostgresProcessedEventStore } from "./processed-event.store.js";
import { LocalMediaFileProcessor } from "./local-media-file.processor.js";
import { createMediaProcessingProcessor } from "./media-processing.processor.js";
import { PostgresMediaProcessingStore } from "./postgres-media-processing.store.js";
import { ClamAvMediaMalwareScanner } from "./clamav-media-malware.scanner.js";
import { PostgresActivityProjector } from "./postgres-activity.projector.js";

const connection = new Redis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
});
const logger = pino({
  name: "dss-worker",
  level: process.env.LOG_LEVEL ?? "info",
});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const recoveryConfigured = Boolean(
  process.env.MAIL_HOST &&
  process.env.MAIL_FROM &&
  process.env.PASSWORD_RESET_WEB_URL,
);
const verificationConfigured = Boolean(
  process.env.MAIL_HOST &&
  process.env.MAIL_FROM &&
  process.env.EMAIL_VERIFICATION_WEB_URL,
);
const mailTransport = recoveryConfigured || verificationConfigured
  ? nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT ?? 587),
      secure: Number(process.env.MAIL_PORT ?? 587) === 465,
      requireTLS:
        process.env.NODE_ENV === "production" &&
        Number(process.env.MAIL_PORT ?? 587) !== 465,
      auth: process.env.MAIL_USER
        ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD }
        : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      logger: false,
      debug: false,
    })
  : null;
const recoveryWorker = mailTransport
  ? new Worker<PasswordRecoveryJob>(
      DSS_QUEUE_NAMES.PASSWORD_RECOVERY,
      createPasswordRecoveryProcessor(
        pool,
        (mail) =>
          mailTransport.sendMail({ ...mail, from: process.env.MAIL_FROM }),
        process.env.PASSWORD_RESET_WEB_URL!,
      ),
      { connection, concurrency: 1 },
    )
  : null;
const verificationWorker = mailTransport && verificationConfigured
  ? new Worker<EmailVerificationJob>(
      DSS_QUEUE_NAMES.EMAIL_VERIFICATION,
      createEmailVerificationProcessor(
        pool,
        (mail) => mailTransport.sendMail({ ...mail, from: process.env.MAIL_FROM }),
        process.env.EMAIL_VERIFICATION_WEB_URL!,
      ),
      { connection, concurrency: 1 },
    )
  : null;
verificationWorker?.on("failed", (job) => {
  logger.error({ jobId: job?.id }, "Email verification delivery failed");
});
recoveryWorker?.on("failed", (job) => {
  // SMTP errors can include recipients or message content. Keep logs secret-free.
  logger.error({ jobId: job?.id }, "Password recovery delivery failed");
});
if (!recoveryConfigured)
  logger.warn(
    "Password recovery worker disabled: configure SMTP and PASSWORD_RESET_WEB_URL",
  );
const consumerName = "dss.worker.integration-events.v2";
const deadLetterQueue = new Queue<DeadLetterIntegrationEventJob>(
  DSS_QUEUE_NAMES.INTEGRATION_EVENTS_DEAD_LETTER,
  { connection },
);
const deadLetters = new DeadLetterService(pool, deadLetterQueue, consumerName);
const activityProjector = new PostgresActivityProjector(pool);
const worker = new Worker<IntegrationEventJob>(
  DSS_QUEUE_NAMES.INTEGRATION_EVENTS,
  createIntegrationEventProcessor(
    new PostgresProcessedEventStore(pool),
    (event) => activityProjector.project(event),
  ),
  { connection },
);
const mediaWorker = new Worker<MediaProcessingJob>(
  DSS_QUEUE_NAMES.MEDIA_PROCESSING,
  createMediaProcessingProcessor(
    new PostgresMediaProcessingStore(pool),
    new LocalMediaFileProcessor(),
    new ClamAvMediaMalwareScanner(),
  ),
  { connection },
);
worker.on("failed", (job, error) => {
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
  void deadLetters.record({
    event: job.data,
    ...(job.id ? { sourceJobId: job.id } : {}),
    reason: error.message,
    attempts: job.attemptsMade,
    failedAt: new Date().toISOString(),
  });
  logger.error(
    { jobId: job.id, eventId: job.data.eventId, err: error },
    "Integration event job exhausted retries",
  );
});
worker.on("completed", (job, result) => {
  logger.info(
    { jobId: job.id, eventId: job.data.eventId, duplicate: result.duplicate },
    "Integration event processed",
  );
});
mediaWorker.on("failed", (job, error) => {
  logger.error(
    { jobId: job?.id, uploadSessionId: job?.data.uploadSessionId, err: error },
    "Media processing job failed",
  );
});
mediaWorker.on("completed", (job, result) => {
  logger.info(
    {
      jobId: job.id,
      uploadSessionId: job.data.uploadSessionId,
      quarantined: result.quarantined,
    },
    "Media upload accepted for processing",
  );
});

const heartbeat = setInterval(() => {
  void connection.set(
    "dss:worker:integration-events:heartbeat",
    new Date().toISOString(),
    "EX",
    30,
  );
}, 10_000);
heartbeat.unref();

async function shutdown(): Promise<void> {
  clearInterval(heartbeat);
  await worker.close();
  await mediaWorker.close();
  await recoveryWorker?.close();
  await verificationWorker?.close();
  mailTransport?.close();
  await deadLetterQueue.close();
  await pool.end();
  await connection.quit();
}
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
