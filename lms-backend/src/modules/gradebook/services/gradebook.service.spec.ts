import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { AcademicFacade } from '../../academic/facades/academic.facade.js';
import type { GradebookRepository } from '../repositories/gradebook.repository.js';
import { GradebookService } from './gradebook.service.js';

describe('GradebookService', () => {
  let service: GradebookService;
  let academicFacade: Record<'assertCanManageClass', ReturnType<typeof vi.fn>>;
  let repository: Record<
    'getClassCode' | 'listColumns' | 'listStudents' | 'listScores',
    ReturnType<typeof vi.fn>
  >;

  const lecturer = {
    id: 'lec-1',
    email: 'gv@lms.edu.vn',
    role: Role.LECTURER,
  } as AuthenticatedUser;

  beforeEach(() => {
    academicFacade = {
      assertCanManageClass: vi.fn().mockResolvedValue(undefined),
    };
    repository = {
      getClassCode: vi.fn().mockResolvedValue('CS101.Q11'),
      listColumns: vi.fn().mockResolvedValue([
        {
          id: 'col-2',
          sectionId: 'sec-1',
          sectionName: 'Week 2',
          kind: 'quiz',
          label: 'KT1',
          title: 'Quiz 1',
          order: 2,
        },
        {
          id: 'col-1',
          sectionId: 'sec-1',
          sectionName: 'Week 1',
          kind: 'assignment',
          label: 'BT1',
          title: 'Lab 1',
          order: 1,
        },
      ]),
      listStudents: vi.fn().mockResolvedValue([
        { id: 's-2', studentCode: 'SV02', fullName: 'Binh Tran' },
        { id: 's-1', studentCode: 'SV01', fullName: 'An Nguyen' },
      ]),
      listScores: vi.fn().mockResolvedValue([
        { studentId: 's-1', columnId: 'col-1', score: 9 },
        { studentId: 's-2', columnId: 'col-2', score: 8 },
      ]),
    };

    service = new GradebookService(
      academicFacade as unknown as AcademicFacade,
      repository as unknown as GradebookRepository,
    );
  });

  it('orders columns and students, filters by search, and paginates', async () => {
    const page1 = await service.getGradebook(
      'cls-1',
      { page: 1, limit: 1 },
      lecturer,
    );

    expect(academicFacade.assertCanManageClass).toHaveBeenCalledWith(
      'cls-1',
      lecturer,
    );
    expect(page1.classCode).toBe('CS101.Q11');
    expect(page1.columns.map((c) => c.id)).toEqual(['col-1', 'col-2']);
    expect(page1.total).toBe(2);
    expect(page1.rows).toHaveLength(1);
    expect(page1.rows[0].studentCode).toBe('SV01');

    const filtered = await service.getGradebook(
      'cls-1',
      { page: 1, limit: 20, search: 'Binh' },
      lecturer,
    );
    expect(filtered.total).toBe(1);
    expect(filtered.rows[0].studentCode).toBe('SV02');
  });

  it('exports the full class gradebook to an xlsx buffer', async () => {
    const file = await service.exportGradebook('cls-1', lecturer);

    expect(academicFacade.assertCanManageClass).toHaveBeenCalledWith(
      'cls-1',
      lecturer,
    );
    expect(file.fileName).toBe('Bang-diem-CS101.Q11.xlsx');
    expect(file.buffer.length).toBeGreaterThan(0);
  });
});
