import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import type { CreateSectionDto } from '../dto/create-section.dto.js'
import type { SaveSectionsDto } from '../dto/save-sections.dto.js'
import { SectionRepository } from '../repositories/section.repository.js'
import { SectionView } from '../types/section-view.type.js'
import { Role } from '../../../common/enums/role.enum.js'

/** Business rules for course sections: readable by class members, editable by the class lecturer. */
@Injectable()
export class SectionService {
  constructor(private readonly sectionRepository: SectionRepository) {}

  /** Lists the sections (with items) of a class: its lecturer, an admin, or an enrolled student. */
  async findByClass(
    classId: string,
    user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    await this.assertCanView(classId, user)
    return this.findViews(classId)
  }

  /** Appends a new, empty section to a class the lecturer teaches. */
  async create(
    classId: string,
    dto: CreateSectionDto,
    user: AuthenticatedUser,
  ): Promise<SectionView> {
    await this.assertTeachesClass(classId, user)
    const section = await this.sectionRepository.createAtEnd(classId, dto.title)
    return SectionView.fromEntity(section)
  }

  /** Replaces the class's sections and items with the editor's state and returns the result. */
  async saveAll(
    classId: string,
    dto: SaveSectionsDto,
    user: AuthenticatedUser,
  ): Promise<SectionView[]> {
    await this.assertTeachesClass(classId, user)
    const sectionIds = dto.sections.map((section) => section.id)
    const itemIds = dto.sections.flatMap((section) =>
      section.items.map((item) => item.id),
    )
    this.assertNoDuplicates(sectionIds)
    this.assertNoDuplicates(itemIds)
    const foreignIds = await this.sectionRepository.findIdsOwnedByOtherClasses(
      classId,
      sectionIds,
      itemIds,
    )
    if (foreignIds.length > 0) {
      throw new BadRequestException('Payload references content of another class')
    }
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

  private assertNoDuplicates(ids: string[]): void {
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate ids in payload')
    }
  }

  private async assertTeachesClass(
    classId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const lecturerId = await this.sectionRepository.findClassLecturerId(classId)
    if (lecturerId === null) throw new NotFoundException('Class not found')
    if (lecturerId !== user.id) {
      throw new ForbiddenException('You do not teach this class')
    }
  }

  private async assertCanView(
    classId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const lecturerId = await this.sectionRepository.findClassLecturerId(classId)
    if (lecturerId === null) throw new NotFoundException('Class not found')
    if (user.role === Role.ADMIN || lecturerId === user.id) return
    if (
      user.role === Role.STUDENT &&
      (await this.sectionRepository.isStudentEnrolled(classId, user.id))
    ) {
      return
    }
    throw new ForbiddenException('You do not have access to this class')
  }
}