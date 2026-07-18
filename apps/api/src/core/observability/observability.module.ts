/** DSS File Passport — structured logging and telemetry composition. */
import { randomUUID } from 'node:crypto';
import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { HttpMetricsInterceptor } from './services/http-metrics.interceptor';

@Global()
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        name: 'dss-api',
        level:
          process.env.LOG_LEVEL ??
          (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        genReqId: (request, response) => {
          const incoming = request.headers['x-request-id'];
          const requestId =
            typeof incoming === 'string' && incoming.length > 0
              ? incoming
              : randomUUID();
          response.setHeader('x-request-id', requestId);
          return requestId;
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.refreshToken',
          ],
          censor: '[REDACTED]',
        },
        customProps: () => ({
          service: 'dss-api',
          environment: process.env.NODE_ENV ?? 'development',
        }),
      },
    }),
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor }],
  exports: [LoggerModule],
})
export class ObservabilityModule {}
