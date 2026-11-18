import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Role } from '../../../common/enums/role.enum.js'
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import { emptyToNull } from '../../../common/utils/string.util.js'
import type { CreateSectionDto } from '../dto/create-section.dto.js'
import type { CreateSectionItemDto } from '../dto/create-section-item.dto.js'
import type { ReorderDto } from '../dto/reorder.dto.js'
import type { SetCompletionDto } from '../dto/set-completion.dto.js'
import type { SaveSectionsDto } from '../dto/save-sections.dto.js'
import type { UpdateSectionItemDto } from '../dto/update-section-item.dto.js'
import type { UpdateSectionDto } from '../dto/update-section.dto.js'
import type { Section } from '../entities/section.entity.js'
import { SectionRepository } from '../repositories/section.repository.js'
import { ClassExamService } from './class-exam.service.js'
import { ContentNotifier, isNotifiableItemType } from './content-notifier.service.js'
import { SectionView } from '../types/section-view.type.js'
import { AcademicFacade } from '../../academic/facades/academic.facade.js'
import { ItemType } from '../enums/item-type.enum.js'
import { extractYoutubeVideoId } from '../utils/youtube.util.js'
import type { SectionItem } from '../entities/section-item.entity.js'
import type { ItemSchedule } from '../types/item-schedule.type.js'
import { ExamFacade } from '../../exam/facades/exam.facade.js'
import { AssignmentFacade } from '../../assignment/facades/assignment.facade.js'

/** The listed ids first (in that order), then every other id in its current order. */
const mergeOrder = (allIds: string[], firstIds: string[]): string[] => {
  const first = new Set(firstIds)
  return [...firstIds, ...allIds.filter((id) => !first.has(id))]
}

/** Which of the three reference columns an item type must fill (VIDEO fills none). */
const REFERENCE_OF: Record<ItemType, 'documentId' | 'assignmentId' | 'examId' | null> = {
  [ItemType.DOCUMENT]: 'documentId',
  [ItemType.ASSIGNMENT]: 'assignmentId',
  [ItemType.EXAM]: 'examId',
  [ItemType.VIDEO]: null,
}

/**
 * Item types that start hidden when added to a section: the lecturer finishes setting them up and
 * opens them when ready. Opening is also the moment students are told on Zalo.
 */
const HIDDEN_ON_CREATE: ReadonlySet<ItemType> = new Set([ItemType.ASSIGNMENT, ItemType.EXAM])

/** Business rules for course sections: readable by class members, editable by the class lecturer. */
@Injectable()
export class SectionService {
  constructor(
    private readonly sectionRepository: SectionRepository,
    private readonly academicFacade: AcademicFacade,
    private readonly classExamService: ClassExamService,
    private readonly contentNotifier: ContentNotifier,
    private readonly assignmentFacade: AssignmentFacade,
    private readonly examFacade: ExamFacade,
  ) {}

  /** Lists the sections (with items) of a class: its lecturer, an admin, or an enrolled student. Students only get what is visible, with their own completion. */
  async findByClass(
    classId: string,
    user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    await this.academicFacade.assertCanViewClass(classId, user)
    const isStudent = user.role === Role.STUDENT
    return this.findViews(classId, isStudent, isStudent ? user.id : undefined)
  }

  /** Appends a new, empty section to a class the lecturer teaches. */
  async create(
    classId: string,
    dto: CreateSectionDto,
    user: AuthenticatedUser,
  ): Promise<SectionView> {
    await this.academicFacade.assertCanManageClass(classId, user)
    const section = await this.sectionRepository.createAtEnd(classId, dto.title)
    return SectionView.fromEntity(section)
  }

  // ----- one-change-at-a-time editing (auto-save); every method answers with the fresh section list -----

  /** Renames, re-describes, shows or hides one section. Opening a hidden section tells the students about its assignments and exams on Zalo. */
  async updateSection(
    classId: string,
    sectionId: string,
    dto: UpdateSectionDto,
    user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    await this.academicFacade.assertCanManageClass(classId, user)
    const before = await this.getSection(classId, sectionId)
    await this.sectionRepository.updateSection(sectionId, {
      title: dto.title,
      description:
        dto.description === undefined ? undefined : emptyToNull(dto.description),
      isVisible: dto.isVisible,
    })
    if (dto.isVisible === true && !before.isVisible) {
      void this.notifySectionOpened(classId, sectionId, user)
    }
    return this.findViews(classId)
  }

  /**
   * Deletes a section. Documents, assignments and exams keep files and submissions in their own modules,
   * so they must be removed from their own screen first; only videos can go away with the section.
   */
  async removeSection(
    classId: string,
    sectionId: string,
    user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    await this.academicFacade.assertCanManageClass(classId, user)
    await this.getSection(classId, sectionId)
    if ((await this.sectionRepository.countLinkedItems(sectionId)) > 0) {
      throw new BadRequestException(
        'This section still holds documents, assignments or exams (deleted ones are kept for 30 days). Hide the section instead',
      )
    }
    await this.sectionRepository.deleteSection(sectionId)
    return this.findViews(classId)
  }

  /** Puts the listed sections first in the given order; the others keep their order after them. */
  async reorderSections(
    classId: string,
    dto: ReorderDto,
    user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    await this.academicFacade.assertCanManageClass(classId, user)
    const currentIds = (await this.sectionRepository.findByClassId(classId)).map(
      (section) => section.id,
    )
    this.assertAllKnown(currentIds, dto.ids)
    await this.sectionRepository.setSectionOrder(
      classId,
      mergeOrder(currentIds, dto.ids),
    )
    return this.findViews(classId)
  }

  /**
   * Appends one item to a section, after checking that it points at something real.
   * Assignments and exams are created hidden; the lecturer opens them later with `updateItem`.
   */
  async createItem(
    classId: string,
    sectionId: string,
    dto: CreateSectionItemDto,
    user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    await this.academicFacade.assertCanManageClass(classId, user)
    await this.getSection(classId, sectionId)
    this.assertValidNewItem(dto)
    if (await this.sectionRepository.itemExists(dto.id)) {
      throw new BadRequestException('Item id already exists')
    }
    if (dto.itemType === ItemType.EXAM) {
      const examId = dto.examId as string
      await this.assertExamsBelongToClass(classId, [examId])
      if (await this.classExamService.isExamInClass(classId, examId)) {
        throw new BadRequestException('An exam can only be added once')
      }
    }
    await this.sectionRepository.createItemAtEnd(sectionId, {
      id: dto.id,
      itemType: dto.itemType,
      title: dto.title,
      externalUrl: dto.externalUrl ?? null,
      documentId: dto.documentId ?? null,
      assignmentId: dto.assignmentId ?? null,
      examId: dto.examId ?? null,
      isVisible: !HIDDEN_ON_CREATE.has(dto.itemType),
    })
    return this.findViews(classId)
  }

  /** Renames, shows or hides one item; a video can also get a new link. Showing a hidden assignment or exam tells the students on Zalo. */
  async updateItem(
    classId: string,
    sectionId: string,
    itemId: string,
    dto: UpdateSectionItemDto,
    user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    await this.academicFacade.assertCanManageClass(classId, user)
    const section = await this.getSection(classId, sectionId)
    const item = await this.sectionRepository.findItem(sectionId, itemId)
    if (item === null) throw new NotFoundException('Item not found')
    if (dto.externalUrl !== undefined) {
      const isValidVideoLink =
        item.itemType === ItemType.VIDEO &&
        Boolean(dto.externalUrl) &&
        extractYoutubeVideoId(dto.externalUrl as string) !== null
      if (!isValidVideoLink) {
        throw new BadRequestException('A video needs a valid YouTube link')
      }
    }
    await this.sectionRepository.updateItem(itemId, {
      title: dto.title,
      externalUrl: dto.externalUrl,
      isVisible: dto.isVisible,
    })
    if (
      dto.isVisible === true &&
      !item.isVisible &&
      section.isVisible &&
      isNotifiableItemType(item.itemType)
    ) {
      void this.notifyItemOpened(classId, sectionId, itemId, user)
    }
    return this.findViews(classId)
  }

  /** Removes a video. Other items are removed through their own module so files and submissions are cleaned up. */
  async removeItem(
    classId: string,
    sectionId: string,
    itemId: string,
    user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    await this.academicFacade.assertCanManageClass(classId, user)
    await this.getSection(classId, sectionId)
    const item = await this.sectionRepository.findItem(sectionId, itemId)
    if (item === null) throw new NotFoundException('Item not found')
    if (item.itemType !== ItemType.VIDEO) {
      throw new BadRequestException(
        'Documents, assignments and exams are removed from their own screen',
      )
    }
    await this.sectionRepository.deleteItem(itemId)
    return this.findViews(classId)
  }

  /** Puts the listed items of a section first in the given order; the others keep their order after them. */
  async reorderItems(
    classId: string,
    sectionId: string,
    dto: ReorderDto,
    user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    await this.academicFacade.assertCanManageClass(classId, user)
    await this.getSection(classId, sectionId)
    const currentIds = (
      await this.sectionRepository.findItemsBySectionIds([sectionId])
    ).map((item) => item.id)
    this.assertAllKnown(currentIds, dto.ids)
    await this.sectionRepository.setItemOrder(
      sectionId,
      mergeOrder(currentIds, dto.ids),
    )
    return this.findViews(classId)
  }

  // ----- student completion -----

  /**
   * A student marks a visible item of an enrolled class as done, or takes the mark back.
   * Idempotent, so opening an item over and over is harmless.
   */
  async setItemCompleted(
    classId: string,
    itemId: string,
    dto: SetCompletionDto,
    user: AuthenticatedUser,
  ): Promise<{ itemId: string; isCompleted: boolean }> {
    await this.academicFacade.assertCanViewClass(classId, user)
    const item = await this.sectionRepository.findItemInClass(classId, itemId)
    if (item === null || !item.isVisible || !item.section.isVisible) {
      throw new NotFoundException('Item not found')
    }
    if (dto.completed) {
      await this.sectionRepository.markCompleted(user.id, itemId)
    } else {
      await this.sectionRepository.unmarkCompleted(user.id, itemId)
    }
    return { itemId, isCompleted: dto.completed }
  }

  // ----- legacy: replace everything at once (deprecated) -----

  /** Replaces the class's sections and items with the editor's state and returns the result. */
  async saveAll(
    classId: string,
    dto: SaveSectionsDto,
    user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    await this.academicFacade.assertCanManageClass(classId, user)
    const sectionIds = dto.sections.map((section) => section.id)
    const itemIds = dto.sections.flatMap((section) =>
      section.items.map((item) => item.id),
    )
    this.assertNoDuplicates(sectionIds)
    this.assertValidVideos(dto)
    const examIds = this.assertValidExamItems(dto)
    this.assertNoDuplicates(itemIds)
    const foreignIds = await this.sectionRepository.findIdsOwnedByOtherClasses(
      classId,
      sectionIds,
      itemIds,
    )
    if (foreignIds.length > 0) {
      throw new BadRequestException('Payload references content of another class')
    }
    await this.assertExamsBelongToClass(classId, examIds)
    await this.sectionRepository.replaceAll(classId, dto.sections)
    return this.findViews(classId)
  }

  private async getSection(classId: string, sectionId: string): Promise<Section> {
    const section = await this.sectionRepository.findSection(classId, sectionId)
    if (section === null) throw new NotFoundException('Section not found')
    return section
  }

  /** Tells the students on Zalo that a section was just opened. Never fails the edit. */
  private async notifySectionOpened(
    classId: string,
    sectionId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    try {
      const section = await this.sectionRepository.findSection(classId, sectionId)
      if (section === null || !section.isVisible) return
      const items = await this.sectionRepository.findItemsBySectionIds([sectionId])
      const visibleItems = items.filter((item) => item.isVisible)
      const schedules = await this.findSchedules(visibleItems)
      await this.contentNotifier.notifySectionOpened(
        classId,
        section.title,
        visibleItems.map((item) => ({
          itemType: item.itemType,
          title: item.title,
          assignmentId: item.assignmentId,
          openAt: schedules.get(item.id)?.openAt ?? null,
          closeAt: schedules.get(item.id)?.closeAt ?? null,
        })),
        user,
      )
    } catch {
      /* a failed notification is not worth failing the edit */
    }
  }

  /** Tells the students on Zalo that an assignment or exam just became visible to them. Never fails the edit. */
  private async notifyItemOpened(
    classId: string,
    sectionId: string,
    itemId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    try {
      const [section, item] = await Promise.all([
        this.sectionRepository.findSection(classId, sectionId),
        this.sectionRepository.findItem(sectionId, itemId),
      ])
      // Students only see an item when both the item and its section are visible.
      if (section === null || item === null) return
      if (!section.isVisible || !item.isVisible) return
      const schedule = (await this.findSchedules([item])).get(item.id)
      await this.contentNotifier.notifyItemOpened(
        classId,
        section.title,
        {
          itemType: item.itemType,
          title: item.title,
          assignmentId: item.assignmentId,
          openAt: schedule?.openAt ?? null,
          closeAt: schedule?.closeAt ?? null,
        },
        user,
      )
    } catch {
      /* a failed notification is not worth failing the edit */
    }
  }

  private async findViews(
    classId: string,
    visibleOnly = false,
    studentId?: string,
  ): Promise<SectionView[]> {
    const allSections = await this.sectionRepository.findByClassId(classId)
    const sections = visibleOnly
      ? allSections.filter((section) => section.isVisible)
      : allSections
    const allItems = await this.sectionRepository.findItemsBySectionIds(
      sections.map((section) => section.id),
    )
    const items = visibleOnly ? allItems.filter((item) => item.isVisible) : allItems
    const completedIds = studentId
      ? await this.sectionRepository.findCompletedItemIds(studentId, items.map((item) => item.id))
      : new Set<string>()
    const schedules = await this.findSchedules(items)
    return sections.map((section) =>
      SectionView.fromEntity(
        section,
        items.filter((item) => item.sectionId === section.id),
        completedIds,
        schedules,
      ),
    )
  }

  /** Every listed id must exist; a stale client must not be able to touch another class. */
  private assertAllKnown(knownIds: string[], ids: string[]): void {
    const known = new Set(knownIds)
    if (ids.some((id) => !known.has(id))) {
      throw new BadRequestException('Order references unknown ids')
    }
  }

  /** A new item must fill exactly the reference its type needs (a video: a YouTube link) and nothing else. */
  private assertValidNewItem(dto: CreateSectionItemDto): void {
    if (dto.itemType === ItemType.VIDEO) {
      if (!dto.externalUrl || extractYoutubeVideoId(dto.externalUrl) === null) {
        throw new BadRequestException('A video needs a valid YouTube link')
      }
    } else if (dto.externalUrl) {
      throw new BadRequestException('Only a video can have a link')
    }
    const needed = REFERENCE_OF[dto.itemType]
    const references = {
      documentId: dto.documentId,
      assignmentId: dto.assignmentId,
      examId: dto.examId,
    }
    for (const [name, value] of Object.entries(references)) {
      if (name === needed ? !value : Boolean(value)) {
        throw new BadRequestException(
          needed === null
            ? 'A video cannot reference a document, assignment or exam'
            : `A ${dto.itemType.toLowerCase()} item must reference exactly one ${needed}`,
        )
      }
    }
  }

  /** A VIDEO item must carry a real YouTube link, so nothing else can ever end up inside the embed. */
  private assertValidVideos(dto: SaveSectionsDto): void {
    const hasInvalidVideo = dto.sections.some((section) =>
      section.items.some(
        (item) =>
          item.itemType === ItemType.VIDEO &&
          (!item.externalUrl || extractYoutubeVideoId(item.externalUrl) === null),
      ),
    )
    if (hasInvalidVideo) {
      throw new BadRequestException('A video needs a valid YouTube link')
    }
  }

  /**
   * An EXAM item must point at exactly one exam (and nothing else), and no other item may carry an exam id.
   * An exam is shown once per class. Returns the exam ids of the payload.
   */
  private assertValidExamItems(dto: SaveSectionsDto): string[] {
    const items = dto.sections.flatMap((section) => section.items)
    const hasStrayExamId = items.some(
      (item) => item.itemType !== ItemType.EXAM && Boolean(item.examId),
    )
    if (hasStrayExamId) {
      throw new BadRequestException('Only an exam item can reference an exam')
    }
    const examItems = items.filter((item) => item.itemType === ItemType.EXAM)
    const isIncomplete = examItems.some(
      (item) => !item.examId || Boolean(item.documentId) || Boolean(item.assignmentId),
    )
    if (isIncomplete) {
      throw new BadRequestException('An exam item must reference an exam')
    }
    const examIds = examItems.map((item) => item.examId as string)
    if (new Set(examIds).size !== examIds.length) {
      throw new BadRequestException('An exam can only be added once')
    }
    return examIds
  }

  /** The exams must exist and belong to this class, so an item can never point at a missing or foreign exam. */
  private async assertExamsBelongToClass(
    classId: string,
    examIds: string[],
  ): Promise<void> {
    if (examIds.length === 0) return
    const found = await this.classExamService.findExamIdsOfClass(classId, examIds)
    if (found.length !== examIds.length) {
      throw new BadRequestException(
        'An exam in this section no longer exists. Remove it and create it again',
      )
    }
  }

  private assertNoDuplicates(ids: string[]): void {
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate ids in payload')
    }
  }

  /** Open/close dates of the assignments and exams among the items, keyed by section item id. */
  private async findSchedules(items: SectionItem[]): Promise<Map<string, ItemSchedule>> {
    const assignmentIds = items
      .map((item) => item.assignmentId)
      .filter((id): id is string => id !== null)
    const examIds = items
      .map((item) => item.examId)
      .filter((id): id is string => id !== null)
    const [assignmentSchedules, examSchedules] = await Promise.all([
      assignmentIds.length > 0
        ? this.assignmentFacade.findSchedules(assignmentIds)
        : new Map<string, ItemSchedule>(),
      examIds.length > 0
        ? this.examFacade.findSchedules(examIds)
        : new Map<string, ItemSchedule>(),
    ])
    const result = new Map<string, ItemSchedule>()
    for (const item of items) {
      const schedule =
        (item.assignmentId && assignmentSchedules.get(item.assignmentId)) ||
        (item.examId && examSchedules.get(item.examId))
      if (schedule) result.set(item.id, schedule)
    }
    return result
  }
}