import { BadRequestException, Injectable } from '@nestjs/common'
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import type { CreateSectionDto } from '../dto/create-section.dto.js'
import type { SaveSectionsDto } from '../dto/save-sections.dto.js'
import { SectionRepository } from '../repositories/section.repository.js'
import { SectionView } from '../types/section-view.type.js'
import { AcademicFacade } from '../../academic/facades/academic.facade.js'

/** Business rules for course sections: readable by class members, editable by the class lecturer. */
@Injectable()
export class SectionService {
  constructor(
    private readonly sectionRepository: SectionRepository,
    private readonly academicFacade: AcademicFacade,
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
}