import { describe, expect, it } from 'vitest';
import type { AuditLogItem } from '../types/audit.types';
import {
  formatChangeValue,
  getActionsForCategory,
  getDatePresetRange,
  getTargetLink,
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
    expect(securityActions.every((a) => a.value.startsWith('LOGIN') || a.value === 'LOGOUT' || a.value === 'REFRESH_TOKEN_REUSED')).toBe(true);
    expect(getActionsForCategory().length).toBeGreaterThan(securityActions.length);
  });

  it('resolves deep links for CLASS, PARTICIPANT, and USER targets', () => {
    expect(getTargetLink(makeLog())).toBe('/courses/cls-1');
    expect(
      getTargetLink(
        makeLog({ entityType: 'PARTICIPANT', parentId: 'cls-2' }),
      ),
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

  it('computes date preset ranges', () => {
    const now = new Date('2026-11-23T15:00:00Z');
    expect(getDatePresetRange('all', now)).toEqual({});
    const sevenDays = getDatePresetRange('7d', now);
    expect(sevenDays.from).toBe('2026-11-16T15:00:00.000Z');
    expect(sevenDays.to).toBe('2026-11-23T15:00:00.000Z');
  });
});
