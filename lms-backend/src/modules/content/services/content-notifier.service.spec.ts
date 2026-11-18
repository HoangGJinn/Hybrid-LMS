import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import type { AcademicFacade } from '../../academic/facades/academic.facade.js';
import type { ZaloFacade } from '../../zalo/index.js';
import { ItemType } from '../enums/item-type.enum.js';
import { ContentNotifier, isNotifiableItemType } from './content-notifier.service.js';

type Mock = ReturnType<typeof vi.fn>;

const CLASS_ID = 'class-1';
const lecturer = { id: 'lec-1', role: Role.LECTURER } as unknown as AuthenticatedUser;

describe('ContentNotifier', () => {
  let notifier: ContentNotifier;
  let academicFacade: { getClassById: Mock; getClassRoster: Mock };
  let zaloFacade: { notifyUsers: Mock };

  beforeEach(() => {
    academicFacade = {
      getClassById: vi.fn().mockResolvedValue({ classCode: 'CS101', name: 'Web' }),
      getClassRoster: vi.fn().mockResolvedValue([{ id: 'stu-1' }, { id: 'stu-2' }]),
    };
    zaloFacade = { notifyUsers: vi.fn().mockResolvedValue(undefined) };
    notifier = new ContentNotifier(
      academicFacade as unknown as AcademicFacade,
      zaloFacade as unknown as ZaloFacade,
    );
  });

  it('only assignments and exams are notifiable', () => {
    expect(isNotifiableItemType(ItemType.ASSIGNMENT)).toBe(true);
    expect(isNotifiableItemType(ItemType.EXAM)).toBe(true);
    expect(isNotifiableItemType(ItemType.DOCUMENT)).toBe(false);
    expect(isNotifiableItemType(ItemType.VIDEO)).toBe(false);
  });

  it('tells every enrolled student when an assignment is opened', async () => {
    await notifier.notifyItemOpened(
      CLASS_ID,
      'Tuần 1',
      { itemType: ItemType.ASSIGNMENT, title: 'Lab 1', assignmentId: 'a-1' },
      lecturer,
    );

    expect(academicFacade.getClassRoster).toHaveBeenCalledWith(CLASS_ID, lecturer);
    const [ids, message] = zaloFacade.notifyUsers.mock.calls[0];
    expect(ids).toEqual(['stu-1', 'stu-2']);
    expect(message).toContain('BÀI TẬP MỚI ĐƯỢC MỞ');
    expect(message).toContain('CS101 - Web');
    expect(message).toContain('Tuần 1');
    expect(message).toContain('Lab 1');
  });

  it('tells every enrolled student when an exam is opened', async () => {
    await notifier.notifyItemOpened(
      CLASS_ID,
      'Tuần 5',
      { itemType: ItemType.EXAM, title: 'Giữa kỳ' },
      lecturer,
    );

    const message = zaloFacade.notifyUsers.mock.calls[0][1] as string;
    expect(message).toContain('BÀI THI MỚI ĐƯỢC MỞ');
    expect(message).toContain('Giữa kỳ');
  });

  it('shows the start and end time of an assignment in Vietnam time', async () => {
    await notifier.notifyItemOpened(
      CLASS_ID,
      'Tuần 1',
      {
        itemType: ItemType.ASSIGNMENT,
        title: 'Lab 1',
        assignmentId: 'a-1',
        openAt: new Date('2099-11-10T01:00:00Z'),
        closeAt: new Date('2099-11-17T16:59:00Z'),
      },
      lecturer,
    );

    const message = zaloFacade.notifyUsers.mock.calls[0][1] as string;
    expect(message).toContain('Bắt đầu: 08:00 10/11/2099');
    expect(message).toContain('Kết thúc: 23:59 17/11/2099');
  });

  it('shows the start and end time of an exam', async () => {
    await notifier.notifyItemOpened(
      CLASS_ID,
      'Tuần 5',
      {
        itemType: ItemType.EXAM,
        title: 'Giữa kỳ',
        openAt: new Date('2099-12-01T02:00:00Z'),
        closeAt: new Date('2099-12-01T04:00:00Z'),
      },
      lecturer,
    );

    const message = zaloFacade.notifyUsers.mock.calls[0][1] as string;
    expect(message).toContain('Bắt đầu: 09:00 01/12/2099');
    expect(message).toContain('Kết thúc: 11:00 01/12/2099');
  });

  it('leaves out the date lines when the schedule is unknown', async () => {
    await notifier.notifyItemOpened(
      CLASS_ID,
      'Tuần 1',
      { itemType: ItemType.ASSIGNMENT, title: 'Lab 1', assignmentId: 'a-1' },
      lecturer,
    );

    const message = zaloFacade.notifyUsers.mock.calls[0][1] as string;
    expect(message).not.toContain('Bắt đầu');
    expect(message).not.toContain('Kết thúc');
  });

  it('shows the dates under each listed item of an opened section', async () => {
    await notifier.notifySectionOpened(
      CLASS_ID,
      'Tuần 2',
      [
        {
          itemType: ItemType.ASSIGNMENT,
          title: 'Lab 2',
          assignmentId: 'a-2',
          openAt: new Date('2099-11-10T01:00:00Z'),
          closeAt: new Date('2099-11-17T16:59:00Z'),
        },
      ],
      lecturer,
    );

    const message = zaloFacade.notifyUsers.mock.calls[0][1] as string;
    expect(message).toContain('Bắt đầu: 08:00 10/11/2099');
    expect(message).toContain('Kết thúc: 23:59 17/11/2099');
  });
  
  it('ignores documents and videos', async () => {
    await notifier.notifyItemOpened(CLASS_ID, 'Tuần 1', { itemType: ItemType.DOCUMENT, title: 'Slide' }, lecturer);
    await notifier.notifyItemOpened(CLASS_ID, 'Tuần 1', { itemType: ItemType.VIDEO, title: 'Video' }, lecturer);

    expect(zaloFacade.notifyUsers).not.toHaveBeenCalled();
  });

  it('lists only the assignments and exams of an opened section', async () => {
    await notifier.notifySectionOpened(
      CLASS_ID,
      'Tuần 2',
      [
        { itemType: ItemType.DOCUMENT, title: 'Slide 2' },
        { itemType: ItemType.ASSIGNMENT, title: 'Lab 2', assignmentId: 'a-2' },
        { itemType: ItemType.EXAM, title: 'Quiz 2' },
      ],
      lecturer,
    );

    const message = zaloFacade.notifyUsers.mock.calls[0][1] as string;
    expect(message).toContain('CHƯƠNG MỚI ĐƯỢC MỞ');
    expect(message).toContain('Cần chú ý (2)');
    expect(message).toContain('Lab 2');
    expect(message).toContain('Quiz 2');
    expect(message).not.toContain('Slide 2');
  });

  it('sends nothing for a section without assignments or exams', async () => {
    await notifier.notifySectionOpened(
      CLASS_ID,
      'Tuần 3',
      [{ itemType: ItemType.DOCUMENT, title: 'Slide 3' }],
      lecturer,
    );

    expect(zaloFacade.notifyUsers).not.toHaveBeenCalled();
  });

  it('still sends when the class name cannot be loaded, and never throws', async () => {
    academicFacade.getClassById.mockRejectedValue(new Error('x'));
    await notifier.notifyItemOpened(
      CLASS_ID,
      'Tuần 1',
      { itemType: ItemType.EXAM, title: 'Quiz' },
      lecturer,
    );
    expect(zaloFacade.notifyUsers).toHaveBeenCalled();

    academicFacade.getClassRoster.mockRejectedValue(new Error('forbidden'));
    await expect(
      notifier.notifyItemOpened(CLASS_ID, 'Tuần 1', { itemType: ItemType.EXAM, title: 'Quiz' }, lecturer),
    ).resolves.toBeUndefined();
  });
});