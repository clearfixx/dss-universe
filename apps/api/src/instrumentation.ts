/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Observability
 * 📄 File: apps/api/src/instrumentation.ts
 *
 * 🎯 Purpose:
 * Initializes explicitly configured telemetry before application bootstrap.
 *
 * 🧠 Responsibilities:
 * • configures API resource identity and auto-instrumentation;
 * • starts and shuts down telemetry only when an exporter is selected.
 *
 * 🏗️ Architecture:
 * Process-level observability composition; contains no business policy.
 *
 * ⚠️ Important:
 * Configure OTEL variables in the process environment before this module loads.
 * Never silently send telemetry to an implicit endpoint.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

const enabled =
  process.env.OTEL_SDK_DISABLED !== 'true' &&
  (Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT) ||
    Boolean(process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) ||
    process.env.OTEL_TRACES_EXPORTER === 'console');

if (enabled) {
  const telemetry = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'dss-api',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '0.1.0',
      'deployment.environment.name': process.env.NODE_ENV ?? 'development',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  telemetry.start();
  process.once('SIGTERM', () => void telemetry.shutdown());
  process.once('SIGINT', () => void telemetry.shutdown());
}
