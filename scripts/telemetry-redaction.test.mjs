import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("real incoming and outgoing HTTP spans redact credentials", () => {
  const source = `
    await import('./src/instrumentation.ts');
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const http = require('node:http');
    const server = http.createServer((_request, response) => response.end('ok'));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const query = new URLSearchParams({ token: 'synthetic-secret-token', code: 'synthetic-secret-code', 'X-Amz-Signature': 'synthetic-secret-signature', page: 'visible-page' });
    await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:' + server.address().port + '/telemetry-proof?' + query, response => {
        response.resume(); response.on('end', resolve);
      }).on('error', reject);
    });
    await new Promise(resolve => server.close(resolve));
    process.emit('SIGTERM');
  `;
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) {
    if (key.startsWith("OTEL_")) delete environment[key];
  }
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-"],
    {
      cwd: new URL("../apps/api/", import.meta.url),
      env: {
        ...environment,
        OTEL_TRACES_EXPORTER: "console",
        OTEL_METRICS_EXPORTER: "none",
        OTEL_LOGS_EXPORTER: "none",
        OTEL_SEMCONV_STABILITY_OPT_IN: "http",
        OTEL_NODE_RESOURCE_DETECTORS: "env,process,host",
      },
      encoding: "utf8",
      input: source,
      timeout: 20000,
    },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /telemetry-proof/);
  assert.match(result.stdout, /visible-page/);
  assert.match(result.stdout, /kind: 1/);
  assert.match(result.stdout, /kind: 2/);
  assert.doesNotMatch(result.stdout + result.stderr, /synthetic-secret-/);
});
