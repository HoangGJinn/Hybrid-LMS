import { beforeEach, describe, expect, it } from 'vitest';
import { HttpMetricsStore } from './http-metrics.store.js';

describe('HttpMetricsStore', () => {
  let store: HttpMetricsStore;

  beforeEach(() => {
    store = new HttpMetricsStore();
  });

  it('ignores health, monitoring, and swagger paths', () => {
    expect(store.shouldIgnorePath('/api/health')).toBe(true);
    expect(store.shouldIgnorePath('/api/admin/monitoring/overview?refresh=true')).toBe(true);
    expect(store.shouldIgnorePath('/api/docs')).toBe(true);
    expect(store.shouldIgnorePath('/api/courses')).toBe(false);
  });

  it('aggregates 60-minute traffic, p95 latencies, and endpoint stats', () => {
    const baseMs = Date.UTC(2026, 10, 24, 10, 0, 0);
    store.recordRequest({
      method: 'GET',
      route: '/api/courses',
      statusCode: 200,
      durationMs: 25,
      nowMs: baseMs,
    });
    store.recordRequest({
      method: 'POST',
      route: '/api/exams/:id/submit',
      statusCode: 500,
      durationMs: 420,
      nowMs: baseMs,
    });
    store.recordRequest({
      method: 'GET',
      route: '/api/auth/me',
      statusCode: 401,
      durationMs: 12,
      nowMs: baseMs - 65 * 60_000, // outside 60m window
    });

    const summary = store.getTrafficSummary(baseMs);
    expect(summary.points).toHaveLength(60);
    expect(summary.totalRequests60m).toBe(2);
    expect(summary.status2xx60m).toBe(1);
    expect(summary.status4xx60m).toBe(0);
    expect(summary.status5xx60m).toBe(1);
    expect(summary.errorRate5xxPercent).toBe(50);
    expect(summary.topEndpoints[0]).toMatchObject({
      method: 'POST',
      route: '/api/exams/:id/submit',
      errors5xx: 1,
      p95LatencyMs: 420,
    });
  });

  it('caps recent server errors at 50 newest-first and clamps in-flight count', () => {
    store.decrementInFlight();
    expect(store.getInFlight()).toBe(0);
    store.incrementInFlight();
    expect(store.getInFlight()).toBe(1);

    for (let i = 1; i <= 55; i += 1) {
      store.recordServerError({
        occurredAt: `2026-11-24T10:00:00Z`,
        method: 'GET',
        path: `/api/item/${i}`,
        statusCode: 500,
        message: `Err ${i}`,
        exceptionName: 'Error',
        requestId: `req-${i}`,
      });
    }

    const summary = store.getTrafficSummary();
    expect(summary.recentErrors).toHaveLength(50);
    expect(summary.recentErrors[0].requestId).toBe('req-55');
  });
});
