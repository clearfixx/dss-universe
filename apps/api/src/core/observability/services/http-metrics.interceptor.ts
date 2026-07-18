/** DSS File Passport — records low-cardinality HTTP metrics through OpenTelemetry. */
import { metrics } from '@opentelemetry/api';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

const meter = metrics.getMeter('dss-api-http');
const requestCount = meter.createCounter('dss.http.server.requests');
const requestDuration = meter.createHistogram('dss.http.server.duration', {
  unit: 'ms',
});

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType<string>() !== 'http') return next.handle();
    const startedAt = performance.now();
    const request = context
      .switchToHttp()
      .getRequest<{ method?: string; route?: { path?: string } }>();
    const response = context
      .switchToHttp()
      .getResponse<{ statusCode?: number }>();
    return next.handle().pipe(
      finalize(() => {
        const attributes = {
          'http.request.method': request.method ?? 'UNKNOWN',
          'http.route': request.route?.path ?? 'unmatched',
          'http.response.status_code': response.statusCode ?? 500,
        };
        requestCount.add(1, attributes);
        requestDuration.record(performance.now() - startedAt, attributes);
      }),
    );
  }
}
