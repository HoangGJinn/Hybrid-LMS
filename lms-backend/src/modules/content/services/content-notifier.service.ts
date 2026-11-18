import { Injectable, Logger } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { AcademicFacade } from '../../academic/facades/academic.facade.js';
import { ZaloFacade, buildFrontendLink, composeZaloMessage } from '../../zalo/index.js';
import { ItemType } from '../enums/item-type.enum.js';

/** Thông tin tối thiểu của một mục để dựng tin (SectionItem thỏa kiểu này). */
export interface OpenedItem {
  readonly itemType: ItemType;
  readonly title: string;
  readonly assignmentId?: string | null;
}

interface NotifiableKind {
  readonly icon: string;
  readonly name: string;
  readonly header: string;
  readonly note: string;
}

/** Chỉ bài tập và bài thi mới gửi thông báo khi được mở. */
const NOTIFIABLE: Partial<Record<ItemType, NotifiableKind>> = {
  [ItemType.ASSIGNMENT]: {
    icon: '📝',
    name: 'Bài tập',
    header: '📝 BÀI TẬP MỚI ĐƯỢC MỞ',
    note: 'Giảng viên vừa mở bài tập cho lớp. Hãy xem yêu cầu và nộp bài đúng hạn nhé!',
  },
  [ItemType.EXAM]: {
    icon: '🧪',
    name: 'Bài thi',
    header: '🧪 BÀI THI MỚI ĐƯỢC MỞ',
    note: 'Giảng viên vừa mở bài thi cho lớp. Hãy xem kỹ lịch thi và quy định trước khi làm bài!',
  },
}

export const isNotifiableItemType = (itemType: ItemType): boolean =>
  NOTIFIABLE[itemType] !== undefined;

const MAX_LISTED_ITEMS = 10;

/** Gửi thông báo Zalo khi giảng viên mở bài tập hoặc bài thi cho sinh viên. Không bao giờ throw. */
@Injectable()
export class ContentNotifier {
  private readonly logger = new Logger(ContentNotifier.name);

  constructor(
    private readonly academicFacade: AcademicFacade,
    private readonly zaloFacade: ZaloFacade,
  ) {}

  /** Một bài tập hoặc bài thi vừa trở nên nhìn thấy được. Các loại mục khác bị bỏ qua. */
  async notifyItemOpened(
    classId: string,
    sectionTitle: string,
    item: OpenedItem,
    user: AuthenticatedUser,
  ): Promise<void> {
    try {
      const kind = NOTIFIABLE[item.itemType];
      if (!kind) return;

      const path =
        item.itemType === ItemType.ASSIGNMENT && item.assignmentId
          ? `/student/courses/${classId}/assignments/${item.assignmentId}`
          : item.itemType === ItemType.EXAM
            ? '/student/exams'
            : `/student/courses/${classId}`;

      const message = composeZaloMessage({
        header: kind.header,
        fields: [
          { icon: '📚', label: 'Lớp', value: await this.classLabel(classId) },
          { icon: '🗂️', label: 'Chương', value: sectionTitle },
          { icon: kind.icon, label: kind.name, value: item.title },
        ],
        footer: this.footer(kind.note, buildFrontendLink(path)),
      });
      await this.send(classId, user, message);
    } catch (e: any) {
      this.logger.warn(`Gửi thông báo mục mới lỗi: ${e.message}`);
    }
  }

  /**
   * Một chương vừa được mở: chỉ liệt kê các bài tập và bài thi đang hiển thị trong chương.
   * Chương không có bài tập hay bài thi thì không gửi gì.
   */
  async notifySectionOpened(
    classId: string,
    sectionTitle: string,
    visibleItems: readonly OpenedItem[],
    user: AuthenticatedUser,
  ): Promise<void> {
    try {
      const notifiable = visibleItems.filter((item) => isNotifiableItemType(item.itemType));
      if (notifiable.length === 0) return;

      const listed = notifiable
        .slice(0, MAX_LISTED_ITEMS)
        .map((item) => `   ${NOTIFIABLE[item.itemType]?.icon ?? '•'} ${item.title}`);
      if (notifiable.length > MAX_LISTED_ITEMS) {
        listed.push(`   … và ${notifiable.length - MAX_LISTED_ITEMS} mục khác`);
      }

      const message = composeZaloMessage({
        header: '📂 CHƯƠNG MỚI ĐƯỢC MỞ',
        fields: [
          { icon: '📚', label: 'Lớp', value: await this.classLabel(classId) },
          { icon: '🗂️', label: 'Chương', value: sectionTitle },
          { icon: '📌', label: `Cần chú ý (${notifiable.length})`, value: listed.join('\n') },
        ],
        footer: this.footer(
          'Giảng viên vừa mở chương này cho lớp.',
          buildFrontendLink(`/student/courses/${classId}`),
        ),
      });
      await this.send(classId, user, message);
    } catch (e: any) {
      this.logger.warn(`Gửi thông báo chương mới lỗi: ${e.message}`);
    }
  }

  private footer(note: string, link: string | null): string {
    return link ? `${note}\n👉 Xem ngay: ${link}` : note;
  }

  /** Mã và tên lớp; không lấy được thì bỏ dòng này, không làm hỏng tin. */
  private async classLabel(classId: string): Promise<string | null> {
    try {
      const classView = await this.academicFacade.getClassById(classId);
      return `${classView.classCode} - ${classView.name}`;
    } catch {
      return null;
    }
  }

  private async send(classId: string, user: AuthenticatedUser, message: string): Promise<void> {
    const roster = await this.academicFacade.getClassRoster(classId, user);
    // id sinh viên trong roster được dùng làm user id của liên kết Zalo
    const studentIds = roster.map((student) => student.id);
    if (studentIds.length === 0) return;
    await this.zaloFacade.notifyUsers(studentIds, message);
  }
}