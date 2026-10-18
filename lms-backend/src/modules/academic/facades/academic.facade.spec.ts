import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AcademicFacade } from './academic.facade.js';
import { ClassService } from '../services/class.service.js';
import { SubjectService } from '../services/subject.service.js';
import { SemesterService } from '../services/semester.service.js';
import { Class } from '../entities/class.entity.js';
import { Subject } from '../entities/subject.entity.js';
import { Semester } from '../entities/semester.entity.js';

describe('AcademicFacade', () => {
  let facade: AcademicFacade;
  let mockClassService: Partial<Record<keyof ClassService, ReturnType<typeof vi.fn>>>;
  let mockSubjectService: Partial<Record<keyof SubjectService, ReturnType<typeof vi.fn>>>;
  let mockSemesterService: Partial<Record<keyof SemesterService, ReturnType<typeof vi.fn>>>;

  const sampleClass: Class = {
    id: 'cls-1',
    classCode: 'CS101.Q1',
    name: 'Intro CS Q1',
    subjectId: 'sub-1',
    semesterId: 'sem-1',
    lecturerId: 'lec-1',
    isActive: true,
    endedAt: null,
  };

  const sampleSubject: Subject = {
    id: 'sub-1',
    subjectCode: 'CS101',
    name: 'Intro to CS',
    description: null,
  };

  const sampleSemester: Semester = {
    id: 'sem-1',
    semesterCode: 'HK1-2026',
    name: 'Học kỳ 1 - 2026',
    startDate: new Date(),
    endDate: new Date(),
  };

  beforeEach(() => {
    mockClassService = {
      findById: vi.fn(),
      findByLecturer: vi.fn(),
      findByStudent: vi.fn(),
      findAll: vi.fn(),
      countStudents: vi.fn(),
      countStudentsBatch: vi.fn(),
    };
    mockSubjectService = {
      findById: vi.fn(),
      findAll: vi.fn(),
    };
    mockSemesterService = {
      findById: vi.fn(),
      findAll: vi.fn(),
      getActiveSemester: vi.fn(),
    };

    facade = new AcademicFacade(
      mockClassService as unknown as ClassService,
      mockSubjectService as unknown as SubjectService,
      mockSemesterService as unknown as SemesterService,
    );
  });

  describe('getClassById', () => {
    it('returns projection with count', async () => {
      mockClassService.findById!.mockResolvedValue(sampleClass);
      mockClassService.countStudents!.mockResolvedValue(20);

      const result = await facade.getClassById('cls-1');

      expect(mockClassService.findById).toHaveBeenCalledWith('cls-1');
      expect(mockClassService.countStudents).toHaveBeenCalledWith('cls-1');
      expect(result.id).toBe('cls-1');
      expect(result.studentCount).toBe(20);
    });
  });

  describe('getClassesByLecturer', () => {
    it('returns classes with batch student counts', async () => {
      mockClassService.findByLecturer!.mockResolvedValue([sampleClass]);
      mockClassService.countStudentsBatch!.mockResolvedValue(
        new Map([['cls-1', 12]]),
      );

      const result = await facade.getClassesByLecturer('lec-1');

      expect(mockClassService.findByLecturer).toHaveBeenCalledWith('lec-1');
      expect(result).toHaveLength(1);
      expect(result[0].studentCount).toBe(12);
    });
  });

  describe('getClassesByStudent', () => {
    it('returns classes enrolled by student', async () => {
      mockClassService.findByStudent!.mockResolvedValue([sampleClass]);
      mockClassService.countStudentsBatch!.mockResolvedValue(
        new Map([['cls-1', 15]]),
      );

      const result = await facade.getClassesByStudent('stu-1');

      expect(mockClassService.findByStudent).toHaveBeenCalledWith('stu-1');
      expect(result).toHaveLength(1);
      expect(result[0].studentCount).toBe(15);
    });
  });

  describe('subjects and semesters queries', () => {
    it('delegates subject methods', async () => {
      mockSubjectService.findById!.mockResolvedValue(sampleSubject);
      mockSubjectService.findAll!.mockResolvedValue([sampleSubject]);

      const sub = await facade.getSubjectById('sub-1');
      expect(sub.id).toBe('sub-1');

      const allSubs = await facade.getAllSubjects();
      expect(allSubs).toHaveLength(1);
    });

    it('delegates semester methods', async () => {
      mockSemesterService.findById!.mockResolvedValue(sampleSemester);
      mockSemesterService.findAll!.mockResolvedValue([sampleSemester]);
      mockSemesterService.getActiveSemester!.mockResolvedValue(sampleSemester);

      const sem = await facade.getSemesterById('sem-1');
      expect(sem.id).toBe('sem-1');

      const allSems = await facade.getAllSemesters();
      expect(allSems).toHaveLength(1);

      const active = await facade.getActiveSemester();
      expect(active?.id).toBe('sem-1');
    });
  });
});
