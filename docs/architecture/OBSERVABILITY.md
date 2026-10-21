# Logging and Observability Baseline

> Status: Phase 4 baseline implemented

DSS runtimes emit structured JSON logs through Pino. API request logs include a stable request ID, service and environment context, response status and duration. An incoming `x-request-id` is preserved; otherwise the platform generates one and returns it to the caller. Authorization, cookies, passwords and refresh tokens are redacted.

OpenTelemetry is initialized before the Nest application and provides Node.js HTTP, Express, PostgreSQL and runtime instrumentation. The SDK follows standard `OTEL_*` environment configuration, allowing OTLP exporters and sampling policy to be selected by deployment without product-code changes. Custom low-cardinality counters and duration histograms use the OpenTelemetry metrics API.

Operational endpoints are deliberately separate:

- `/api/health/live` proves that the API process is alive;
- `/api/health/ready` verifies PostgreSQL, Redis and BullMQ access;
- `/api/health` provides the compatibility readiness view.

The worker emits structured success/failure logs and refreshes a short-lived Redis heartbeat. API readiness reports that heartbeat as worker context without coupling API availability to the separately deployable worker process.

Production deployments must configure an OTLP collector/backend through standard OpenTelemetry variables. Vendor-specific dashboards and alert policies are deployment concerns and remain outside the application boundary.
