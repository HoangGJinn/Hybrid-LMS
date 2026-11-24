import { describe, expect, it } from 'vitest';
import {
  computePercentile,
  detectContainerRuntime,
  normalizeRoutePath,
  parseCgroupCpuStat,
  parseCgroupV1CpuQuota,
  parseCgroupV1Memory,
  parseCgroupV2CpuQuota,
  parseCgroupV2Memory,
  parseProcMeminfo,
} from './cgroup-linux.util.js';

describe('cgroup-linux.util', () => {
  describe('detectContainerRuntime', () => {
    it('detects Docker via /.dockerenv or /proc/1/cgroup', () => {
      expect(detectContainerRuntime(true, false, null, 'linux')).toBe('DOCKER');
      expect(
        detectContainerRuntime(
          false,
          false,
          '0::/system.slice/docker-abc123.scope',
          'linux',
        ),
      ).toBe('DOCKER');
      expect(detectContainerRuntime(false, false, '0::/init.scope', 'linux')).toBe(
        'LINUX_HOST',
      );
      expect(detectContainerRuntime(false, false, null, 'win32')).toBe(
        'LOCAL_OS',
      );
    });
  });

  describe('parseCgroupV2Memory', () => {
    it('subtracts inactive_file page cache from cgroup v2 current usage', () => {
      const result = parseCgroupV2Memory(
        '1073741824\n',
        '629145600\n',
        'anon 400000000\ninactive_file 104857600\n',
      );
      expect(result).toEqual({
        usedBytes: 524288000,
        totalBytes: 1073741824,
      });
    });

    it('returns null when memory.max is unbounded', () => {
      expect(parseCgroupV2Memory('max\n', '1048576\n', null)).toBeNull();
    });
  });

  describe('parseCgroupV1Memory', () => {
    it('parses capped container limit and ignores unbounded 64-bit limit', () => {
      const hostTotal = 8 * 1024 * 1024 * 1024;
      expect(
        parseCgroupV1Memory(
          String(2 * 1024 * 1024 * 1024),
          String(512 * 1024 * 1024),
          'total_inactive_file 12582912\n',
          hostTotal,
        ),
      ).toEqual({
        usedBytes: 512 * 1024 * 1024 - 12582912,
        totalBytes: 2 * 1024 * 1024 * 1024,
      });

      expect(
        parseCgroupV1Memory('9223372036854771712', '1024', null, hostTotal),
      ).toBeNull();
    });
  });

  describe('parseProcMeminfo', () => {
    it('computes host used and available memory from MemTotal and MemAvailable', () => {
      const meminfo = [
        'MemTotal:        8192000 kB',
        'MemFree:          512000 kB',
        'MemAvailable:    3072000 kB',
      ].join('\n');

      expect(parseProcMeminfo(meminfo)).toEqual({
        totalBytes: 8192000 * 1024,
        availableBytes: 3072000 * 1024,
        usedBytes: 5120000 * 1024,
      });
    });
  });

  describe('CPU quota and throttling parsers', () => {
    it('parses cgroup v2 cpu.max and cgroup v1 cfs quota', () => {
      expect(parseCgroupV2CpuQuota('150000 100000\n')).toBe(1.5);
      expect(parseCgroupV2CpuQuota('max 100000\n')).toBeNull();
      expect(parseCgroupV1CpuQuota('200000', '100000')).toBe(2);
      expect(parseCgroupV1CpuQuota('-1', '100000')).toBeNull();
    });

    it('parses cpu.stat usage and throttling counters', () => {
      const stat = parseCgroupCpuStat(
        'usage_usec 4200000\nnr_periods 100\nnr_throttled 12\nthrottled_usec 85000\n',
      );
      expect(stat).toEqual({
        usageUsec: 4200000,
        nrPeriods: 100,
        nrThrottled: 12,
        throttledUsec: 85000,
      });
    });
  });

  describe('computePercentile & normalizeRoutePath', () => {
    it('computes percentiles safely and collapses UUID/numeric segments', () => {
      expect(computePercentile([], 95)).toBe(0);
      expect(computePercentile([10, 20, 30, 40, 100], 95)).toBe(100);
      expect(
        normalizeRoutePath('GET', '/api/exams', '/:id/submit', '/api/exams/123'),
      ).toEqual({ method: 'GET', route: '/api/exams/:id/submit' });
      expect(
        normalizeRoutePath(
          'get',
          '',
          undefined,
          '/api/courses/550e8400-e29b-41d4-a716-446655440000?foo=bar',
        ),
      ).toEqual({ method: 'GET', route: '/api/courses/:id' });
    });
  });
});
