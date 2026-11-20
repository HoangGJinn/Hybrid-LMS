import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { gradebookService } from '../api/gradebook.service';

const useDebouncedValue = <T,>(value: T, delay = 300): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

export const PAGE_SIZE = 8;

export const useGradebook = (classId: string, search: string, page: number) => {
  const debouncedSearch = useDebouncedValue(search);
  return useQuery({
    queryKey: ['gradebook', classId, debouncedSearch, page],
    queryFn: () =>
      gradebookService.getGradebook(classId, {
        search: debouncedSearch,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: classId !== '',
    placeholderData: keepPreviousData,
  });
};