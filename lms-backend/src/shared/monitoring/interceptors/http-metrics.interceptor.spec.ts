import { EventEmitter } from 'node:events';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { HttpMetricsStore } from '../services/http-metrics.store.js';
import { HttpMetricsInterceptor } from './http-metrics.interceptor.js';

describe('HttpMetricsInterceptor', () => {
  let store: HttpMetricsStore;
  let interceptor: HttpMetricsInterceptor;

  beforeEach(() => {
    store = new HttpMetricsStore();
    interceptor = new HttpMetricsInterceptor(store);
  });

  it('skips non-http, OPTIONS, and ignored monitoring/health routes', () => {
    const wsContext = {
      getType: () => 'ws',
    } as unknown as ExecutionContext;
    const next: CallHandler = { handle: () => of('ok') };

    interceptor.intercept(wsContext, next);
    expect(store.getInFlight()).toBe(0);

    const optionsCtx = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({ method: 'OPTIONS', url: '/api/courses' }),
        getResponse: () => new EventEmitter(),
      }),
    } as unknown as ExecutionContext;
    interceptor.intercept(optionsCtx, next);
    expect(store.getInFlight()).toBe(0);

    const healthCtx = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', originalUrl: '/api/health' }),
        getResponse: () => new EventEmitter(),
      }),
    } as unknown as ExecutionContext;
    interceptor.intercept(healthCtx, next);
    expect(store.getInFlight()).toBe(0);
  });

  it('tracks in-flight count and records route latency/status on finish', () => {
    const req = {
      method: 'POST',
      baseUrl: '/api/exams',
      route: { path: '/:id/submit' },
      originalUrl: '/api/exams/123/submit',
    } as unknown as Request;
    const res = new EventEmitter() as unknown as Response & EventEmitter;
    res.statusCode = 201;

    const ctx = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;
    const next: CallHandler = { handle: () => of('ok') };

    interceptor.intercept(ctx, next);
    expect(store.getInFlight()).toBe(1);

    res.emit('finish');
    res.emit('close');
    expect(store.getInFlight()).toBe(0);

    const summary = store.getTrafficSummary();
    expect(summary.totalRequests60m).toBe(1);
    expect(summary.status2xx60m).toBe(1);
    expect(summary.topEndpoints[0]).toMatchObject({
      method: 'POST',
      route: '/api/exams/:id/submit',
      requests: 1,
    });
  });

  it('decrements in-flight on premature close without recording finish', () => {
    const req = {
      method: 'GET',
      originalUrl: '/api/courses',
    } as unknown as Request;
    const res = new EventEmitter() as unknown as Response & EventEmitter;
    res.statusCode = 499;

    const ctx = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;

    interceptor.intercept(ctx, { handle: () => of('ok') });
    expect(store.getInFlight()).toBe(1);

    res.emit('close');
    expect(store.getInFlight()).toBe(0);
    expect(store.getTrafficSummary().totalRequests60m).toBe(0);
  });
});
