import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { courseKeys } from '@features/courses';
import { participantKeys } from '../api/queryKeys';
import { useRefreshParticipants } from './useRefreshParticipants';

describe('useRefreshParticipants', () => {
  it('refreshes the class participants and every cache that shows studentCount', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRefreshParticipants('cls-1'), { wrapper });
    await result.current();

    const filters = invalidate.mock.calls.map(([f]) => f);
    const keys = filters.map((f) => f?.queryKey);

    // participants of this class
    expect(keys).toContainEqual(participantKeys.list('cls-1'));
    expect(keys).toContainEqual(participantKeys.roster('cls-1'));
    expect(keys).toContainEqual(participantKeys.candidatesAll('cls-1'));
    // Courses page and Dashboard (lecturer), student course list
    expect(keys).toContainEqual(courseKeys.myLecturer);
    expect(keys).toContainEqual(courseKeys.mine);
    // the class itself, but not its sections
    const detail = filters.find(
      (f) => JSON.stringify(f?.queryKey) === JSON.stringify(courseKeys.detail('cls-1')),
    );
    expect(detail?.exact).toBe(true);
  });

  it('does not touch other classes', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRefreshParticipants('cls-1'), { wrapper });
    await result.current();

    const keys = invalidate.mock.calls.map(([f]) => JSON.stringify(f?.queryKey));
    expect(keys.some((k) => k.includes('cls-2'))).toBe(false);
  });
});
