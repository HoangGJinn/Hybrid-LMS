import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssignmentItemRepository } from '../repositories/assignment-item.repository.js';
import { ClassAssignmentService } from './class-assignment.service.js';

type Mock = ReturnType<typeof vi.fn>;

describe('ClassAssignmentService', () => {
  let service: ClassAssignmentService;
  let repo: Record<keyof AssignmentItemRepository, Mock>;

  beforeEach(() => {
    repo = {
      existsInClass: vi.fn().mockResolvedValue(true),
      findByClasses: vi
        .fn()
        .mockResolvedValue([{ assignmentId: 'a-1', classId: 'c-1' }]),
      deleteItemsByAssignment: vi.fn().mockResolvedValue(1),
      isAssignmentReferenced: vi.fn().mockResolvedValue(false),
    };
    service = new ClassAssignmentService(
      repo as unknown as AssignmentItemRepository,
    );
  });

  it('delegates class assignment checks and removals to repository', async () => {
    expect(await service.isAssignmentInClass('c-1', 'a-1')).toBe(true);
    expect(await service.findAssignmentsByClasses(['c-1'])).toEqual([
      { assignmentId: 'a-1', classId: 'c-1' },
    ]);
    expect(await service.removeAssignment('c-1', 'a-1')).toBe(1);
    expect(await service.isAssignmentReferenced('a-1')).toBe(false);
  });
});

