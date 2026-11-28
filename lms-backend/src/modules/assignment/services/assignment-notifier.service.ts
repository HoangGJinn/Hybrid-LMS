import { Injectable, Logger } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { AcademicFacade } from '../../academic/facades/academic.facade.js';
import { ZaloFacade } from '../../zalo/index.js';
import type { Assignment } from '../entities/assignment.entity.js';

const formatDateTime = (date: Date): string =>
  date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

/** Gửi thông báo Zalo cho sự kiện "bài tập mới". Không bao giờ throw. */
@Injectable()
export class AssignmentNotifier {
  private readonly logger = new Logger(AssignmentNotifier.name);

  constructor(
    private readonly academicFacade: AcademicFacade,
    private readonly zaloFacade: ZaloFacade,
  ) {}

  /**
   * Bài tập mới: báo cho toàn bộ sinh viên ghi danh trong lớp.
   * `user` là giảng viên (hoặc admin) đang thao tác, dùng để lấy danh sách lớp theo đúng quyền.
   */
  async notifyCreated(
    classId: string,
    assignment: Assignment,
    user: AuthenticatedUser,
  ): Promise<void> {
    try {
      const roster = await this.academicFacade.getClassRoster(classId, user);
      // id sinh viên trong roster được dùng làm user id của liên kết Zalo
      const studentIds = roster.map((student) => student.id);
      if (studentIds.length === 0) return;

      const message = [
        `📌 Bài tập mới: ${assignment.title}`,
        `Bắt đầu: ${formatDateTime(assignment.openAt)}`,
        `Kết thúc: ${formatDateTime(assignment.endAt)}`,
      ].join('\n');
      await this.zaloFacade.notifyUsers(studentIds, message);
    } catch (e: any) {
      this.logger.warn(`Gửi thông báo bài tập mới lỗi: ${e.message}`);
    }
  }
}