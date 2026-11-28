import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { StudentDashboardService } from '../services/student-dashboard.service.js';
import type { StudentDashboardOverview } from '../types/student-dashboard-overview.type.js';
import { StudentDashboardController } from './student-dashboard.controller.js';

describe('StudentDashboardController', () => {
  let controller: StudentDashboardController;
  let mockService: Partial<
    Record<keyof StudentDashboardService, ReturnType<typeof vi.fn>>
  >;
  const student = {
    id: 'stu-1',
    email: 'stu@school.edu.vn',
    role: Role.STUDENT,
  };

  beforeEach(() => {
    mockService = {
      getOverview: vi
        .fn()
        .mockResolvedValue({} as StudentDashboardOverview),
    };
    controller = new StudentDashboardController(
      mockService as unknown as StudentDashboardService,
    );
  });

  it('forwards authenticated student id and parses valid days', async () => {
    await controller.getOverview(student, '30');
    expect(mockService.getOverview).toHaveBeenCalledWith(
      'stu-1',
      expect.any(Date),
      30,
    );
  });

  it('passes undefined when days is omitted or non-numeric', async () => {
    await controller.getOverview(student);
    await controller.getOverview(student, 'invalid');
    expect(mockService.getOverview).toHaveBeenNthCalledWith(
      1,
      'stu-1',
      expect.any(Date),
      undefined,
    );
    expect(mockService.getOverview).toHaveBeenNthCalledWith(
      2,
      'stu-1',
      expect.any(Date),
      undefined,
    );
  });
});
