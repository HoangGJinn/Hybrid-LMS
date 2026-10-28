import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ParticipantService } from './participant.service.js';
import { ClassService } from './class.service.js';
import { ClassStudentRepository } from '../repositories/class-student.repository.js';
import { UserFacade } from '../../user/facades/user.facade.js';
import { StudentSummary } from '../../user/types/student-summary.type.js';
import { Class } from '../entities/class.entity.js';
import { ClassStudent } from '../entities/class-student.entity.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { Role } from '../../../common/enums/role.enum.js';

describe('ParticipantService', () => {
  let service: ParticipantService;
  let mockClassService: Partial<
    Record<keyof ClassService, ReturnType<typeof vi.fn>>
  >;
  let mockParticipantRepo: Partial<
    Record<keyof ClassStudentRepository, ReturnType<typeof vi.fn>>
  >;
  let mockUserFacade: Partial<
    Record<keyof UserFacade, ReturnType<typeof vi.fn>>
  >;

  const admin: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@school.edu.vn',
    role: Role.ADMIN,
  };
  const owner: AuthenticatedUser = {
    id: 'lec-1',
    email: 'lecturer@school.edu.vn',
    role: Role.LECTURER,
  };
  const otherLecturer: AuthenticatedUser = {
    id: 'lec-2',
    email: 'other@school.edu.vn',
    role: Role.LECTURER,
  };
  const studentUser: AuthenticatedUser = {
    id: 'stu-9',
    email: 'student@school.edu.vn',
    role: Role.STUDENT,
  };

  const openClass = {
    id: 'cls-1',
    classCode: 'CS101.Q11',
    lecturerId: 'lec-1',
    isActive: true,
  } as Class;
  const endedClass = { ...openClass, isActive: false } as Class;

  const makeStudent = (overrides: Partial<StudentSummary> = {}): StudentSummary => ({
    userId: 'stu-1',
    studentCode: 'SV26000001',
    fullName: 'Nguyen Van A',
    email: 'a@school.edu.vn',
    isActive: true,
    status: 'STUDYING',
    enrollmentBlockedReason: null,
    ...overrides,
  });

  const makeEnrolment = (student: StudentSummary): ClassStudent =>
    ({
      classId: 'cls-1',
      studentId: student.userId,
      joinedAt: new Date('2026-10-01T00:00:00Z'),
      student: {
        userId: student.userId,
        studentCode: student.studentCode,
        status: student.status,
        user: {
          fullName: student.fullName,
          email: student.email,
          isActive: student.isActive,
        },
      },
    }) as unknown as ClassStudent;

  const uniqueViolation = () =>
    new QueryFailedError(
      'INSERT',
      [],
      Object.assign(new Error('duplicate key'), { code: '23505' }),
    );

  beforeEach(() => {
    mockClassService = { findById: vi.fn().mockResolvedValue(openClass) };
    mockParticipantRepo = {
      findByClass: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
      exists: vi.fn().mockResolvedValue(false),
      findStudentIds: vi.fn().mockResolvedValue(new Set<string>()),
      add: vi.fn().mockResolvedValue(undefined),
      addMany: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn(),
    };
    mockUserFacade = {
      findStudentsByIds: vi.fn().mockResolvedValue([]),
      findStudentsByCodes: vi.fn().mockResolvedValue([]),
      findStudentsByEmails: vi.fn().mockResolvedValue([]),
      searchEnrollableStudents: vi.fn().mockResolvedValue([]),
    };
    service = new ParticipantService(
      mockClassService as unknown as ClassService,
      mockParticipantRepo as unknown as ClassStudentRepository,
      mockUserFacade as unknown as UserFacade,
    );
  });

  describe('who may manage a class', () => {
    it('lets an admin manage any class', async () => {
      await expect(service.list('cls-1', admin)).resolves.toEqual([]);
    });

    it('lets the lecturer of the class manage it', async () => {
      await expect(service.list('cls-1', owner)).resolves.toEqual([]);
    });

    it('refuses a lecturer who does not teach the class', async () => {
      await expect(service.list('cls-1', otherLecturer)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockParticipantRepo.findByClass).not.toHaveBeenCalled();
    });

    it('refuses a student', async () => {
      await expect(
        service.add('cls-1', studentUser, { studentId: 'stu-1' }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockParticipantRepo.add).not.toHaveBeenCalled();
    });

    it('propagates "class not found"', async () => {
      mockClassService.findById!.mockRejectedValue(new NotFoundException());

      await expect(service.list('missing', admin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('list', () => {
    it('maps the enrolments to participants and trims the search text', async () => {
      const student = makeStudent();
      mockParticipantRepo.findByClass!.mockResolvedValue([makeEnrolment(student)]);

      const result = await service.list('cls-1', admin, '  van a ');

      expect(mockParticipantRepo.findByClass).toHaveBeenCalledWith(
        'cls-1',
        'van a',
      );
      expect(result).toEqual([
        {
          studentId: 'stu-1',
          studentCode: 'SV26000001',
          fullName: 'Nguyen Van A',
          email: 'a@school.edu.vn',
          status: 'STUDYING',
          isActive: true,
          joinedAt: new Date('2026-10-01T00:00:00Z'),
        },
      ]);
    });

    it('treats a blank search as no search', async () => {
      await service.list('cls-1', admin, '   ');

      expect(mockParticipantRepo.findByClass).toHaveBeenCalledWith(
        'cls-1',
        undefined,
      );
    });
  });

  describe('searchCandidates', () => {
    it('flags the students who are already in the class', async () => {
      mockUserFacade.searchEnrollableStudents!.mockResolvedValue([
        makeStudent(),
        makeStudent({ userId: 'stu-2', studentCode: 'SV26000002' }),
      ]);
      mockParticipantRepo.findStudentIds!.mockResolvedValue(new Set(['stu-2']));

      const result = await service.searchCandidates('cls-1', admin, 'sv26', 20);

      expect(result.map((c) => [c.studentId, c.alreadyInClass])).toEqual([
        ['stu-1', false],
        ['stu-2', true],
      ]);
    });

    it('keeps the limit between 1 and 50', async () => {
      await service.searchCandidates('cls-1', admin, undefined, 500);
      await service.searchCandidates('cls-1', admin, undefined, 0);

      expect(mockUserFacade.searchEnrollableStudents).toHaveBeenNthCalledWith(
        1,
        undefined,
        50,
      );
      expect(mockUserFacade.searchEnrollableStudents).toHaveBeenNthCalledWith(
        2,
        undefined,
        1,
      );
    });
  });

  describe('add (UC-24)', () => {
    const student = makeStudent();

    it('adds the student and returns the new participant', async () => {
      mockUserFacade.findStudentsByIds!.mockResolvedValue([student]);
      mockParticipantRepo.findOne!.mockResolvedValue(makeEnrolment(student));

      const result = await service.add('cls-1', owner, { studentId: 'stu-1' });

      expect(mockParticipantRepo.add).toHaveBeenCalledWith('cls-1', 'stu-1');
      expect(result.studentCode).toBe('SV26000001');
    });

    it('reports an error when the student is already in the class (exception 3.1)', async () => {
      mockUserFacade.findStudentsByIds!.mockResolvedValue([student]);
      mockParticipantRepo.exists!.mockResolvedValue(true);

      const error = await service
        .add('cls-1', admin, { studentId: 'stu-1' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message).toBe(
        'Nguyen Van A (SV26000001) is already a participant of this class',
      );
      expect(mockParticipantRepo.add).not.toHaveBeenCalled();
    });

    it('reports the same error when another request added the student first', async () => {
      mockUserFacade.findStudentsByIds!.mockResolvedValue([student]);
      mockParticipantRepo.add!.mockRejectedValue(uniqueViolation());

      await expect(
        service.add('cls-1', admin, { studentId: 'stu-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows unexpected database errors', async () => {
      mockUserFacade.findStudentsByIds!.mockResolvedValue([student]);
      mockParticipantRepo.add!.mockRejectedValue(new Error('db down'));

      await expect(
        service.add('cls-1', admin, { studentId: 'stu-1' }),
      ).rejects.toThrow('db down');
    });

    it('rejects an id that is not a student', async () => {
      mockUserFacade.findStudentsByIds!.mockResolvedValue([]);

      await expect(
        service.add('cls-1', admin, { studentId: 'stu-404' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a student who cannot join (deactivated or not studying)', async () => {
      mockUserFacade.findStudentsByIds!.mockResolvedValue([
        makeStudent({ enrollmentBlockedReason: 'The student account is deactivated' }),
      ]);

      await expect(
        service.add('cls-1', admin, { studentId: 'stu-1' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockParticipantRepo.add).not.toHaveBeenCalled();
    });

    it('refuses to change a class that has ended', async () => {
      mockClassService.findById!.mockResolvedValue(endedClass);

      await expect(
        service.add('cls-1', admin, { studentId: 'stu-1' }),
      ).rejects.toThrow(ConflictException);
      expect(mockUserFacade.findStudentsByIds).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes the enrolment', async () => {
      mockParticipantRepo.remove!.mockResolvedValue(true);

      await service.remove('cls-1', owner, 'stu-1');

      expect(mockParticipantRepo.remove).toHaveBeenCalledWith('cls-1', 'stu-1');
    });

    it('reports a student who is not in the class', async () => {
      mockParticipantRepo.remove!.mockResolvedValue(false);

      await expect(service.remove('cls-1', admin, 'stu-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('refuses to change a class that has ended', async () => {
      mockClassService.findById!.mockResolvedValue(endedClass);

      await expect(service.remove('cls-1', admin, 'stu-1')).rejects.toThrow(
        ConflictException,
      );
      expect(mockParticipantRepo.remove).not.toHaveBeenCalled();
    });

    it('refuses a lecturer who does not teach the class', async () => {
      await expect(
        service.remove('cls-1', otherLecturer, 'stu-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('importParticipants', () => {
    const s1 = makeStudent();
    const s2 = makeStudent({
      userId: 'stu-2',
      studentCode: 'SV26000002',
      fullName: 'Tran Thi B',
      email: 'b@school.edu.vn',
    });
    const s3 = makeStudent({
      userId: 'stu-3',
      studentCode: 'SV26000003',
      fullName: 'Le Van C',
      email: 'c@school.edu.vn',
      enrollmentBlockedReason: 'The student account is deactivated',
    });

    beforeEach(() => {
      mockUserFacade.findStudentsByCodes!.mockResolvedValue([s1, s2, s3]);
      mockUserFacade.findStudentsByEmails!.mockResolvedValue([s2]);
    });

    it('adds the valid rows and reports every row', async () => {
      mockParticipantRepo.findStudentIds!.mockResolvedValue(new Set(['stu-2']));

      const result = await service.importParticipants('cls-1', admin, {
        rows: [
          { line: 2, studentCode: 'sv26000001' }, // lower case is accepted
          { line: 3, studentCode: 'SV26000002' }, // already in the class
          { line: 4, studentCode: 'SV26000003' }, // deactivated account
          { line: 5, studentCode: 'SV29999999' }, // unknown code
          { line: 6, studentCode: 'SV26000001' }, // same student again
          { line: 7 }, // nothing to identify the student
        ],
      });

      expect(mockParticipantRepo.addMany).toHaveBeenCalledWith('cls-1', ['stu-1']);
      expect(result).toMatchObject({
        dryRun: false,
        total: 6,
        added: 1,
        skipped: 2,
        failed: 3,
      });
      expect(result.rows.map((r) => [r.line, r.status])).toEqual([
        [2, 'added'],
        [3, 'skipped'],
        [4, 'error'],
        [5, 'error'],
        [6, 'skipped'],
        [7, 'error'],
      ]);
      expect(result.rows[2].message).toBe('The student account is deactivated');
      expect(result.rows[3].message).toBe('No student with code SV29999999');
      expect(result.rows[4].message).toBe('Duplicate of an earlier row in the file');
      expect(result.rows[5].message).toBe('Provide a student code or an email');
    });

    it('finds a student by email when the row has no code', async () => {
      const result = await service.importParticipants('cls-1', admin, {
        rows: [{ line: 2, email: 'B@School.edu.vn' }],
      });

      expect(mockUserFacade.findStudentsByEmails).toHaveBeenCalledWith([
        'b@school.edu.vn',
      ]);
      expect(mockParticipantRepo.addMany).toHaveBeenCalledWith('cls-1', ['stu-2']);
      expect(result.rows[0]).toMatchObject({
        status: 'added',
        studentCode: 'SV26000002',
        fullName: 'Tran Thi B',
      });
    });

    it('rejects a row whose code and email belong to different students', async () => {
      const result = await service.importParticipants('cls-1', admin, {
        rows: [{ line: 2, studentCode: 'SV26000001', email: 'b@school.edu.vn' }],
      });

      expect(result.rows[0]).toMatchObject({
        status: 'error',
        message: 'The student code and the email belong to different students',
      });
      expect(mockParticipantRepo.addMany).toHaveBeenCalledWith('cls-1', []);
    });

    it('reports an unknown email', async () => {
      mockUserFacade.findStudentsByEmails!.mockResolvedValue([]);

      const result = await service.importParticipants('cls-1', admin, {
        rows: [{ line: 2, email: 'nobody@school.edu.vn' }],
      });

      expect(result.rows[0].message).toBe(
        'No student with email nobody@school.edu.vn',
      );
    });

    it('writes nothing in a dry run (preview)', async () => {
      const result = await service.importParticipants('cls-1', admin, {
        rows: [{ line: 2, studentCode: 'SV26000001' }],
        dryRun: true,
      });

      expect(result).toMatchObject({ dryRun: true, added: 1 });
      expect(mockParticipantRepo.addMany).not.toHaveBeenCalled();
    });

    it('refuses a class that has ended', async () => {
      mockClassService.findById!.mockResolvedValue(endedClass);

      await expect(
        service.importParticipants('cls-1', admin, {
          rows: [{ line: 2, studentCode: 'SV26000001' }],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses a lecturer who does not teach the class', async () => {
      await expect(
        service.importParticipants('cls-1', otherLecturer, {
          rows: [{ line: 2, studentCode: 'SV26000001' }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
