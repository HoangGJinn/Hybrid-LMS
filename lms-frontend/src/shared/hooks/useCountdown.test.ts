import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from './useCountdown';

describe('useCountdown hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates remaining time correctly', () => {
    const now = 1000000;
    vi.setSystemTime(now);
    const target = now + 125_000; // 2 minutes 5 seconds

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.expired).toBe(false);
    expect(result.current.minutes).toBe(2);
    expect(result.current.seconds).toBe(5);
  });

  it('updates countdown as time advances', () => {
    const now = 1000000;
    vi.setSystemTime(now);
    const target = now + 5000; // 5 seconds

    const { result } = renderHook(() => useCountdown(target));
    expect(result.current.seconds).toBe(5);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.seconds).toBe(3);
  });

  it('marks as expired when countdown reaches zero', () => {
    const now = 1000000;
    vi.setSystemTime(now);
    const target = now - 1000; // already past

    const { result } = renderHook(() => useCountdown(target));

    expect(result.current.expired).toBe(true);
    expect(result.current.ms).toBe(0);
    expect(result.current.seconds).toBe(0);
  });
});
