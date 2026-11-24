import { describe, expect, it } from 'vitest';
import type { AuditLogItem } from '../types/audit.types';
import {
  formatChangeValue,
  getActionDotTone,
  getActionsForCategory,
  getDatePresetRange,
  getTargetLink,
  summarizeUserAgent,
} from './audit-display';

const makeLog = (overrides: Partial<AuditLogItem> = {}): AuditLogItem => ({
  id: 'log-1',
  occurredAt: '2026-11-23T10:00:00Z',
  actorId: 'admin-1',
  actorEmail: 'admin@school.edu.vn',
  actorName: 'Admin',
  actorRole: 'ADMIN',
  category: 'ADMIN',
  action: 'CLASS_UPDATED',
  result: 'SUCCESS',
  entityType: 'CLASS',
  entityId: 'cls-1',
  entityLabel: 'CS101.Q11',
  parentType: null,
  parentId: null,
  summary: 'Updated course',
  changes: null,
  metadata: null,
  ipAddress: '127.0.0.1',
  userAgent: 'Vitest',
  requestId: 'req-1',
  ...overrides,
});

describe('audit-display utilities', () => {
  it('filters available actions by category', () => {
    const securityActions = getActionsForCategory('SECURITY');
    expect(
      securityActions.every(
        (a) =>
          a.value.startsWith('LOGIN') ||
          a.value === 'LOGOUT' ||
          a.value === 'REFRESH_TOKEN_REUSED',
      ),
    ).toBe(true);
    expect(getActionsForCategory().length).toBeGreaterThan(
      securityActions.length,
    );
  });

  it('resolves deep links for CLASS, PARTICIPANT, and USER targets', () => {
    expect(getTargetLink(makeLog())).toBe('/courses/cls-1');
    expect(
      getTargetLink(makeLog({ entityType: 'PARTICIPANT', parentId: 'cls-2' })),
    ).toBe('/courses/cls-2/participants');
    expect(
      getTargetLink(
        makeLog({ entityType: 'USER', metadata: { role: 'STUDENT' } }),
      ),
    ).toBe('/students');
    expect(getTargetLink(makeLog({ entityType: 'AUTH' }))).toBeNull();
  });

  it('formats change values cleanly', () => {
    expect(formatChangeValue(null)).toBe('—');
    expect(formatChangeValue(false)).toBe('false');
    expect(formatChangeValue(['SV01', 'SV02'])).toBe('SV01, SV02');
  });

  it('computes stable Vietnam date preset ranges without volatile millisecond bounds', () => {
    // 2026-11-23T18:30:00Z is 2026-11-24 01:30:00 in Asia/Ho_Chi_Minh (+07:00)
    const firstRender = new Date('2026-11-23T18:30:00.123Z');
    const secondRender = new Date('2026-11-23T18:35:45.987Z');

    expect(getDatePresetRange('all', firstRender)).toEqual({});
    expect(getDatePresetRange('today', firstRender)).toEqual({
      from: '2026-11-24',
    });
    expect(getDatePresetRange('7d', firstRender)).toEqual({
      from: '2026-11-18',
    });
    expect(getDatePresetRange('7d', secondRender)).toEqual(
      getDatePresetRange('7d', firstRender),
    );
    expect(getDatePresetRange('30d', firstRender)).toEqual({
      from: '2026-10-26',
    });
  });

  it('prioritizes failure outcomes when picking semantic dot tone', () => {
    expect(
      getActionDotTone({ action: 'CLASS_UPDATED', result: 'FAILURE' }),
    ).toBe('bg-destructive');
    expect(
      getActionDotTone({ action: 'CLASS_CREATED', result: 'SUCCESS' }),
    ).toBe('bg-success');
    expect(
      getActionDotTone({ action: 'LOGIN_SUCCEEDED', result: 'SUCCESS' }),
    ).toBe('bg-brand');
  });

  it('summarizes user-agent strings into readable browser and OS labels', () => {
    expect(
      summarizeUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      ),
    ).toBe('Chrome 131 on Windows');
    expect(
      summarizeUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.51',
      ),
    ).toBe('Edge 131 on Windows');
    expect(
      summarizeUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe('Chrome 130 on Android');
    expect(summarizeUserAgent('Vitest')).toBe('Vitest');
    expect(summarizeUserAgent(null)).toBeNull();
  });
});
