import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ClassAccessPolicy, ClassAccessSubject } from './class-access.policy.js';
import { ClassStudentRepository } from '../repositories/class-student.repository.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { Role } from '../../../common/enums/role.enum.js';

const user = (id: string, role: Role): AuthenticatedUser =>
  ({ id, role, email: `${id}@school.edu.vn` }) as AuthenticatedUser;

const admin = user('admin-1', Role.ADMIN);
const owner = user('lec-1', Role.LECTURER);
const otherLecturer = user('lec-2', Role.LECTURER);
const enrolledStudent = user('stu-1', Role.STUDENT);
const outsideStudent = user('stu-2', Role.STUDENT);

const openClass: ClassAccessSubject = {
  id: 'cls-1',
  lecturerId: 'lec-1',
  isActive: true,
};
const endedClass: ClassAccessSubject = { ...openClass, isActive: false };

describe('ClassAccessPolicy', () => {
  let exists: ReturnType<typeof vi.fn>;
  let policy: ClassAccessPolicy;

  beforeEach(() => {
    exists = vi
      .fn()
      .mockImplementation((_classId: string, studentId: string) =>
        Promise.resolve(studentId === 'stu-1'),
      );
    policy = new ClassAccessPolicy({ exists } as unknown as ClassStudentRepository);
  });

  describe.each([
    ['open', openClass],
    ['ended', endedClass],
  ])('on an %s class', (_label, cls) => {
    describe('assertCanView', () => {
      it('lets an admin in without looking at enrolments', async () => {
        await expect(policy.assertCanView(cls, admin)).resolves.toBeUndefined();
        expect(exists).not.toHaveBeenCalled();
      });

      it('lets the class lecturer in', async () => {
        await expect(policy.assertCanView(cls, owner)).resolves.toBeUndefined();
        expect(exists).not.toHaveBeenCalled();
      });

      it('refuses another lecturer', async () => {
        await expect(policy.assertCanView(cls, otherLecturer)).rejects.toThrow(
          ForbiddenException,
        );
        expect(exists).not.toHaveBeenCalled();
      });

      it('lets an enrolled student in', async () => {
        await expect(
          policy.assertCanView(cls, enrolledStudent),
        ).resolves.toBeUndefined();
        expect(exists).toHaveBeenCalledWith('cls-1', 'stu-1');
      });

      it('refuses a student who is not enrolled', async () => {
        await expect(policy.assertCanView(cls, outsideStudent)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('assertCanManage', () => {
      it('lets an admin manage any class', () => {
        expect(() => policy.assertCanManage(cls, admin)).not.toThrow();
      });

      it('lets the class lecturer manage it', () => {
        expect(() => policy.assertCanManage(cls, owner)).not.toThrow();
      });

      it('refuses another lecturer', () => {
        expect(() => policy.assertCanManage(cls, otherLecturer)).toThrow(
          ForbiddenException,
        );
      });

      it('refuses students, even enrolled ones', () => {
        expect(() => policy.assertCanManage(cls, enrolledStudent)).toThrow(
          ForbiddenException,
        );
        expect(exists).not.toHaveBeenCalled();
      });
    });
  });

  describe('assertParticipantsEditable', () => {
    it('allows changes while the class is open', () => {
      expect(() => policy.assertParticipantsEditable(openClass)).not.toThrow();
    });

    it('refuses changes once the class has ended', () => {
      expect(() => policy.assertParticipantsEditable(endedClass)).toThrow(
        ConflictException,
      );
    });
  });
});
