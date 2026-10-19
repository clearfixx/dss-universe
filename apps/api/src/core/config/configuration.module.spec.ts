/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Configuration Tests
 * 📄 File: apps/api/src/core/config/configuration.module.spec.ts
 *
 * 🎯 Purpose:
 * Preserves loader identity and Nest registration across removal of a barrel cycle.
 *
 * 🧠 Responsibilities:
 * • pins ordered runtime factories and unchanged registration options;
 * • checks module metadata without reading environment files or starting services.
 *
 * 🏗️ Architecture:
 * Focused assembly characterization with only the framework registration mocked.
 *
 * ⚠️ Important:
 * Real application startup remains an E2E obligation, not proved by this mock.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ConfigModule } from '@nestjs/config';
import {
  configs,
  appConfig,
  databaseConfig,
  jwtConfig,
  mailConfig,
  openaiConfig,
  redisConfig,
} from './config-loaders';
import { ConfigurationModule } from './configuration.module';
import { validationSchema } from './validation.schema';

jest.mock('@nestjs/config', () => {
  const actual =
    jest.requireActual<typeof import('@nestjs/config')>('@nestjs/config');
  return {
    ...actual,
    ConfigModule: { forRoot: jest.fn(() => ({ module: actual.ConfigModule })) },
  };
});

describe('configuration module assembly', () => {
  const registration = Object.getOwnPropertyDescriptor(ConfigModule, 'forRoot')
    ?.value as jest.MockedFunction<typeof ConfigModule.forRoot>;
  it('keeps the original ordered factory identities', () => {
    expect(configs).toEqual([
      appConfig,
      databaseConfig,
      jwtConfig,
      mailConfig,
      openaiConfig,
      redisConfig,
    ]);
  });

  it('registers the same loader array and all existing environment options once', () => {
    expect(registration).toHaveBeenCalledTimes(1);
    expect(registration).toHaveBeenCalledWith({
      isGlobal: true,
      load: configs,
      validationSchema,
      envFilePath: ['.env.local', '.env'],
      expandVariables: true,
    });
    expect(registration.mock.calls[0][0]?.load).toBe(configs);
  });

  it('retains the framework registration as the sole Nest module import', () => {
    expect(Reflect.getMetadata('imports', ConfigurationModule)).toEqual([
      registration.mock.results[0].value,
    ]);
  });

  for (const firstEntry of ['./index', './configuration.module']) {
    it(`registers the same loaders when ${firstEntry} is imported first`, () => {
      const callsBefore = registration.mock.calls.length;
      jest.isolateModules(() => {
        jest.requireActual(firstEntry);
        const publicEntry =
          jest.requireActual<typeof import('./index')>('./index');
        const framework =
          jest.requireMock<typeof import('@nestjs/config')>('@nestjs/config');
        const isolatedRegistration = Object.getOwnPropertyDescriptor(
          framework.ConfigModule,
          'forRoot',
        )?.value as jest.MockedFunction<typeof ConfigModule.forRoot>;
        expect(isolatedRegistration).toBe(registration);
        expect(isolatedRegistration).toHaveBeenCalledTimes(callsBefore + 1);
        expect(isolatedRegistration.mock.calls[callsBefore][0]?.load).toBe(
          publicEntry.configs,
        );
        expect(publicEntry.configs).toHaveLength(6);
      });
    });
  }
});
