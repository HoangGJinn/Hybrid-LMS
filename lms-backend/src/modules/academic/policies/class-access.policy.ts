import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { ClassStudentRepository } from '../repositories/class-student.repository.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';

/** The part of a class the access rules need; a `Class` entity satisfies it. */
export interface ClassAccessSubject {
  readonly id: string;
  readonly lecturerId: string;
  readonly isActive: boolean;
}

/**
 * Single source of truth for "who may do what in a class".
 * Used by classes, participants and sections so the rules cannot drift apart.
 *
 * - view:   admin (any class), the class lecturer, or a student enrolled in the class.
 * - manage: admin (any class) or the class lecturer. Students never manage.
 *
 * Roles that are allowed to reach an endpoint at all are still decided by `@Auth(...)` on the
 * controller; this policy only answers the per-class question.
 *
 * Ended classes (policy decision):
 * - Participants are frozen once the class has ended (`assertParticipantsEditable`).
 * - Sections are NOT frozen: a lecturer can still edit the content of an ended class.
 *   Freezing sections later means calling a similar check from `SectionService.create/saveAll`.
 */
@Injectable()
export class ClassAccessPolicy {
  constructor(private readonly classStudentRepo: ClassStudentRepository) {}

  /** Admin: any class. Lecturer: only their own class. Student: only a class they are enrolled in. */
  async assertCanView(
    cls: ClassAccessSubject,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (this.canManage(cls, user)) return;
    if (
      user.role === Role.STUDENT &&
      (await this.classStudentRepo.exists(cls.id, user.id))
    ) {
      return;
    }
    throw new ForbiddenException('You do not have access to this class');
  }

  /** Admin: any class. Lecturer: only a class they teach. */
  assertCanManage(cls: ClassAccessSubject, user: AuthenticatedUser): void {
    if (this.canManage(cls, user)) return;
    throw new ForbiddenException('You can only manage your own classes');
  }

  /** Participants are frozen once a class has ended, like the rest of the class. */
  assertParticipantsEditable(cls: ClassAccessSubject): void {
    if (!cls.isActive) {
      throw new ConflictException(
        'This class has ended, so its participants can no longer be changed',
      );
    }
  }

  private canManage(cls: ClassAccessSubject, user: AuthenticatedUser): boolean {
    if (user.role === Role.ADMIN) return true;
    return user.role === Role.LECTURER && cls.lecturerId === user.id;
  }
}
