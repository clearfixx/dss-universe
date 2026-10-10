/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Observability
 * 📄 File: apps/api/src/instrumentation.spec.ts
 *
 * 🎯 Purpose:
 * Verifies telemetry requires explicit exporter configuration at startup.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
const start = jest.fn();
jest.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: jest.fn().mockImplementation(() => ({ start, shutdown: jest.fn() })),
}));
jest.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: jest.fn(() => []),
}));

describe('telemetry startup', () => {
  const original = process.env;
  const signals = ['SIGINT', 'SIGTERM'] as const;
  let listeners: Map<string, Array<(signal: NodeJS.Signals) => void>>;

  beforeEach(() => {
    process.env = { ...original };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('OTEL_')) delete process.env[key];
    }
    start.mockClear();
    listeners = new Map(
      signals.map((signal) => [signal, process.listeners(signal)]),
    );
  });

  afterEach(() => {
    process.env = original;
    for (const signal of signals) {
      for (const listener of process.listeners(signal)) {
        if (!listeners.get(signal)!.includes(listener))
          process.removeListener(signal, listener);
      }
    }
  });

  const load = () =>
    jest.isolateModules(() => {
      jest.requireActual<Record<string, unknown>>('./instrumentation');
    });

  it('does not start an implicit exporter', () => {
    load();
    expect(start).not.toHaveBeenCalled();
  });

  it('starts with an explicit OTLP endpoint', () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
    load();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('does not choose an implicit OTLP endpoint from an exporter name', () => {
    process.env.OTEL_TRACES_EXPORTER = 'otlp';
    load();
    expect(start).not.toHaveBeenCalled();
  });

  it('allows an explicitly selected local console exporter', () => {
    process.env.OTEL_TRACES_EXPORTER = 'console';
    load();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('honors an explicit SDK disable even with an endpoint', () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
    process.env.OTEL_SDK_DISABLED = 'true';
    load();
    expect(start).not.toHaveBeenCalled();
  });
});
