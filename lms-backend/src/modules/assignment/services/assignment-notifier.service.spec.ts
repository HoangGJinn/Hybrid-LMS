import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { AcademicFacade } from '../../academic/facades/academic.facade.js';
import type { ZaloFacade } from '../../zalo/index.js';
import type { Assignment } from '../entities/assignment.entity.js';
import { AssignmentNotifier } from './assignment-notifier.service.js';

type Mock = ReturnType<typeof vi.fn>;

const CLASS_ID = 'class-1';

const lecturer = {
  id: 'lec-1',
  role: Role.LECTURER,
} as unknown as AuthenticatedUser;

const buildAssignment = (): Assignment =>
  ({
    id: 'assign-1',
    title: 'Lab 1',
    openAt: new Date('2099-11-03T08:00:00Z'),
    endAt: new Date('2099-11-10T08:00:00Z'),
  }) as Assignment;

describe('AssignmentNotifier', () => {
  let notifier: AssignmentNotifier;
  let academicFacade: { getClassRoster: Mock };
  let zaloFacade: { notifyUsers: Mock };

  beforeEach(() => {
    academicFacade = {
      getClassRoster: vi.fn().mockResolvedValue([{ id: 'stu-1' }, { id: 'stu-2' }]),
    };
    zaloFacade = {
      notifyUsers: vi.fn().mockResolvedValue(undefined),
    };

    notifier = new AssignmentNotifier(
      academicFacade as unknown as AcademicFacade,
      zaloFacade as unknown as ZaloFacade,
    );
  });

  it('sends the title and due date to every enrolled student', async () => {
    await notifier.notifyCreated(CLASS_ID, buildAssignment(), lecturer);

    expect(academicFacade.getClassRoster).toHaveBeenCalledWith(CLASS_ID, lecturer);
    expect(zaloFacade.notifyUsers).toHaveBeenCalledWith(
      ['stu-1', 'stu-2'],
      expect.stringContaining('Lab 1'),
    );
    expect(zaloFacade.notifyUsers.mock.calls[0][1]).toContain('Bắt đầu');
    expect(zaloFacade.notifyUsers.mock.calls[0][1]).toContain('Kết thúc');
  });

  it('does nothing when the class has no enrolled students', async () => {
    academicFacade.getClassRoster.mockResolvedValue([]);

    await notifier.notifyCreated(CLASS_ID, buildAssignment(), lecturer);

    expect(zaloFacade.notifyUsers).not.toHaveBeenCalled();
  });

  it('never throws when the roster lookup fails (for example no permission)', async () => {
    academicFacade.getClassRoster.mockRejectedValue(new Error('forbidden'));

    await expect(
      notifier.notifyCreated(CLASS_ID, buildAssignment(), lecturer),
    ).resolves.toBeUndefined();
    expect(zaloFacade.notifyUsers).not.toHaveBeenCalled();
  });

  it('never throws when sending fails', async () => {
    zaloFacade.notifyUsers.mockRejectedValue(new Error('zalo down'));

    await expect(
      notifier.notifyCreated(CLASS_ID, buildAssignment(), lecturer),
    ).resolves.toBeUndefined();
  });
});