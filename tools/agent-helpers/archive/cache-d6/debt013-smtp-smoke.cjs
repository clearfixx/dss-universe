/**
 * DSS Universe — Local Mailpit delivery verification.
 * File: node_modules/.cache/debt013-smtp-smoke.cjs
 * Purpose: prove loopback SMTP acceptance and retrieval of one synthetic message.
 * Invariants: no external host, no credentials, no existing message disclosure.
 */
const { createRequire } = require('node:module');
const { randomUUID } = require('node:crypto');
const requireWorker = createRequire(require('node:path').resolve('apps/worker/package.json'));
const nodemailer = requireWorker('nodemailer');
(async () => {
  const marker = 'dss-readiness-' + randomUUID();
  const transport = nodemailer.createTransport({ host: '127.0.0.1', port: 2525, secure: false, ignoreTLS: true, connectionTimeout: 3000, greetingTimeout: 3000, socketTimeout: 3000 });
  try {
    await transport.verify();
    const receipt = await transport.sendMail({ from: 'readiness@dss.invalid', to: 'capture@dss.invalid', subject: marker, text: 'Synthetic local readiness test. No account credentials or verification tokens.' });
    const response = await fetch('http://127.0.0.1:18025/api/v1/messages?limit=50', { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error('Mailbox API unavailable');
    const mailbox = await response.json();
    const found = mailbox.messages.filter(message => message.Subject === marker);
    if (receipt.accepted.length !== 1 || found.length !== 1) throw new Error('Synthetic delivery not confirmed');
    console.log(JSON.stringify({ smtpVerified: true, accepted: receipt.accepted.length, syntheticRetrieved: found.length, total: mailbox.total }));
  } finally { transport.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
