/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Auth Test Infrastructure
 * 📄 File: apps/api/test/helpers/verification-worker-probe.mjs
 *
 * 🎯 Purpose:
 * Runs actual Worker verification source under Node 24 for isolated DB regressions.
 *
 * 🧠 Responsibilities:
 * • accepts synthetic fixture configuration over stdin, never command arguments;
 * • returns captured test mail only to the parent test and closes its pool.
 *
 * 🏗️ Architecture:
 * Test-only native ESM process bridge; no SQL copy or production loader changes.
 *
 * ⚠️ Important:
 * Never print tokens to logs or use this helper as a production mail worker.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Pool } from 'pg';
import { createEmailVerificationProcessor } from '../../../worker/src/email-verification.processor.ts';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const { connectionString, schema, email } = JSON.parse(input);
if (!/^verification_test_[a-f0-9]{32}$/.test(schema)) {
  throw new Error('Invalid verification fixture schema');
}
const pool = new Pool({
  connectionString,
  options: `-c search_path=${schema},public`,
  application_name: schema,
});
try {
  const sent = [];
  const processor = createEmailVerificationProcessor(
    pool,
    (mail) => {
      sent.push(mail);
      return Promise.resolve();
    },
    'https://dss.test/verify',
  );
  await processor({
    data: { userId: 'u', email, requestedAt: new Date().toISOString() },
  });
  process.stdout.write(JSON.stringify(sent));
} finally {
  await pool.end();
}
