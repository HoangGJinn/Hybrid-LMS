import { BadRequestException, Injectable } from '@nestjs/common'
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import type { CreateSectionDto } from '../dto/create-section.dto.js'
import type { SaveSectionsDto } from '../dto/save-sections.dto.js'
import { SectionRepository } from '../repositories/section.repository.js'
import { ClassExamService } from './class-exam.service.js'
import { SectionView } from '../types/section-view.type.js'
import { AcademicFacade } from '../../academic/facades/academic.facade.js'
import { ItemType } from '../enums/item-type.enum.js'
import { extractYoutubeVideoId } from '../utils/youtube.util.js'

/** Business rules for course sections: readable by class members, editable by the class lecturer. */
@Injectable()
export class SectionService {
  constructor(
    private readonly sectionRepository: SectionRepository,
    private readonly academicFacade: AcademicFacade,
    private readonly classExamService: ClassExamService,
  ) {}

  /** Lists the sections (with items) of a class: its lecturer, an admin, or an enrolled student. */
  async findByClass(
    classId: string,
    user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    await this.academicFacade.assertCanViewClass(classId, user)
    return this.findViews(classId)
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

  private async findViews(classId: string): Promise<SectionView[]> {
    const sections = await this.sectionRepository.findByClassId(classId)
    const items = await this.sectionRepository.findItemsBySectionIds(
      sections.map((section) => section.id),
    )
    return sections.map((section) =>
      SectionView.fromEntity(
        section,
        items.filter((item) => item.sectionId === section.id),
      ),
    )
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
}