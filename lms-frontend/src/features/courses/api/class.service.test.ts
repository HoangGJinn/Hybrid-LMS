import { describe, expect, it, vi, beforeEach } from 'vitest';
import { classService } from './class.service';
import * as http from '@core/api/http';

vi.mock('@core/api/http', () => ({
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
}));

describe('classService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getMyClasses via GET /api/classes/my', async () => {
    const mockClasses = [{ id: 'cls-1', name: 'Web Dev' }];
    vi.mocked(http.get).mockResolvedValue(mockClasses);

    const result = await classService.getMyClasses();

    expect(http.get).toHaveBeenCalledWith('/api/classes/my');
    expect(result).toEqual(mockClasses);
  });

  it('calls getMyCourses with complete query parameters', async () => {
    const mockPaginated = {
      items: [{ id: 'cls-1', name: 'Web Dev' }],
      total: 1,
      page: 1,
      limit: 6,
      totalPages: 1,
    };
    vi.mocked(http.get).mockResolvedValue(mockPaginated);

    const result = await classService.getMyCourses({
      page: 2,
      limit: 6,
      search: 'Web',
      status: 'in_progress',
      sort: 'name',
    });

    expect(http.get).toHaveBeenCalledWith(
      '/api/classes/my?page=2&limit=6&search=Web&status=in_progress&sort=name',
    );
    expect(result).toEqual(mockPaginated);
  });

  it('calls getMyCourses with empty query string when no params are given', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0 });

    await classService.getMyCourses();

    expect(http.get).toHaveBeenCalledWith('/api/classes/my');
  });

  it('omits status when status is all', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0 });

    await classService.getMyCourses({
      page: 1,
      limit: 6,
      status: 'all',
    });

    expect(http.get).toHaveBeenCalledWith('/api/classes/my?page=1&limit=6');
  });
});

