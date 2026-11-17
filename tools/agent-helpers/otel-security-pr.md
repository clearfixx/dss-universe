Updates the API OpenTelemetry bundle to 0.80.0 and SDK to 0.222.0, resolving the audited HTTP query and database identity instrumentation advisories. Incoming and outgoing HTTP spans now redact DSS credential query parameters alongside the upstream signed-URL defaults; PostgreSQL enhanced parameter reporting is explicitly disabled.

Security-policy tests verify the actual resolved HTTP/PG versions and launch the real API instrumentation against a loopback HTTP server. Both server and client spans must omit synthetic credentials while preserving a non-sensitive query parameter. Startup configuration tests preserve explicit exporter opt-in.

Validation: security-policy 18/18, startup tests 5/5; full local quality gate is running. No frontend source changes.
