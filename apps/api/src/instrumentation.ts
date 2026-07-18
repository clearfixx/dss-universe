/** DSS File Passport — initializes OpenTelemetry before application bootstrap. */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

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
