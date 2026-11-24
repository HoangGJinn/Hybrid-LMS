import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { HttpMetricsStore } from '../services/http-metrics.store.js';
import { normalizeRoutePath } from '../utils/cgroup-linux.util.js';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly store: HttpMetricsStore) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const rawUrl = req.originalUrl || req.url || '/';

    if (req.method === 'OPTIONS' || this.store.shouldIgnorePath(rawUrl)) {
      return next.handle();
    }

    const startedAt = performance.now();
    this.store.incrementInFlight();

    let settled = false;
    const settleInFlight = () => {
      if (settled) return;
      settled = true;
      this.store.decrementInFlight();
    };

    res.once('close', settleInFlight);
    res.once('finish', () => {
      settleInFlight();
      const routeTemplate = (req.route as { path?: string } | undefined)?.path;
      const { method, route } = normalizeRoutePath(
        req.method,
        req.baseUrl ?? '',
        typeof routeTemplate === 'string' ? routeTemplate : undefined,
        rawUrl,
      );
      this.store.recordRequest({
        method,
        route,
        statusCode: res.statusCode,
        durationMs: performance.now() - startedAt,
      });
    });

    return next.handle();
  }
}
