import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Not, Repository } from 'typeorm'
import { Class } from '../../academic/entities/class.entity.js'
import type { SaveSectionDto } from '../dto/save-section.dto.js'
import { SectionItem } from '../entities/section-item.entity.js'
import { Section } from '../entities/section.entity.js'
import { ClassStudent } from '../../academic/entities/class-student.entity.js'

/** All TypeORM access for sections and their items. */
@Injectable()
export class SectionRepository {
  constructor(
    @InjectRepository(Section)
    private readonly sectionOrmRepository: Repository<Section>,
    @InjectRepository(SectionItem)
    private readonly itemOrmRepository: Repository<SectionItem>,
    @InjectRepository(Class)
    private readonly classOrmRepository: Repository<Class>,
  ) {}

  /** Returns the lecturer id that teaches the class, or null when the class does not exist. */
  async findClassLecturerId(classId: string): Promise<string | null> {
    const found = await this.classOrmRepository.findOne({
      where: { id: classId },
      select: { id: true, lecturerId: true },
    })
    return found?.lecturerId ?? null
  }

  /** Lists the sections of a class in display order. */
  async findByClassId(classId: string): Promise<Section[]> {
    return this.sectionOrmRepository.find({
      where: { classId },
      order: { orderIndex: 'ASC' },
    })
  }

  /** Lists the items of the given sections in display order. */
  async findItemsBySectionIds(sectionIds: string[]): Promise<SectionItem[]> {
    if (sectionIds.length === 0) return []
    return this.itemOrmRepository.find({
      where: { sectionId: In(sectionIds) },
      order: { orderIndex: 'ASC' },
    })
  }

  /** Returns those of the given ids that already belong to a section of a different class. */
  async findIdsOwnedByOtherClasses(
    classId: string,
    sectionIds: string[],
    itemIds: string[],
  ): Promise<string[]> {
    const sections =
      sectionIds.length === 0
        ? []
        : await this.sectionOrmRepository.find({
            select: { id: true },
            where: { id: In(sectionIds), classId: Not(classId) },
          })
    const items =
      itemIds.length === 0
        ? []
        : await this.itemOrmRepository
            .createQueryBuilder('item')
            .innerJoin('item.section', 'section')
            .select('item.id', 'id')
            .where('item.id IN (:...itemIds)', { itemIds })
            .andWhere('section.classId != :classId', { classId })
            .getRawMany<{ id: string }>()
    return [...sections.map((section) => section.id), ...items.map((item) => item.id)]
  }

  /** Appends a section after the last one of the class, inside one transaction. */
  async createAtEnd(classId: string, title: string): Promise<Section> {
    return this.sectionOrmRepository.manager.transaction(async (manager) => {
      const raw = await manager
        .getRepository(Section)
        .createQueryBuilder('section')
        .select('COALESCE(MAX(section.orderIndex), 0)', 'maxOrder')
        .where('section.classId = :classId', { classId })
        .getRawOne<{ maxOrder: number | string }>()
      const orderIndex = Number(raw?.maxOrder ?? 0) + 1
      return manager.save(manager.create(Section, { classId, title, orderIndex }))
    })
  }

  /** Makes the class's sections and items match the given list exactly, in one transaction. */
  async replaceAll(
    classId: string,
    sections: readonly SaveSectionDto[],
  ): Promise<void> {
    await this.sectionOrmRepository.manager.transaction(async (manager) => {
      const keptItemIds = sections.flatMap((section) =>
        section.items.map((item) => item.id),
      )
      await this.deleteItemsNotIn(manager, classId, keptItemIds)
      await this.deleteSectionsNotIn(
        manager,
        classId,
        sections.map((section) => section.id),
      )
      await this.upsertSections(manager, classId, sections)
      await this.upsertItems(manager, sections)
    })
  }

  private async deleteItemsNotIn(
    manager: EntityManager,
    classId: string,
    keptIds: string[],
  ): Promise<void> {
    const query = manager
      .createQueryBuilder()
      .delete()
      .from(SectionItem)
      .where('section_id IN (SELECT id FROM sections WHERE class_id = :classId)', {
        classId,
      })
    if (keptIds.length > 0) query.andWhere('id NOT IN (:...keptIds)', { keptIds })
    await query.execute()
  }

  private async deleteSectionsNotIn(
    manager: EntityManager,
    classId: string,
    keptIds: string[],
  ): Promise<void> {
    const query = manager
      .createQueryBuilder()
      .delete()
      .from(Section)
      .where('class_id = :classId', { classId })
    if (keptIds.length > 0) query.andWhere('id NOT IN (:...keptIds)', { keptIds })
    await query.execute()
  }

  private async upsertSections(
    manager: EntityManager,
    classId: string,
    sections: readonly SaveSectionDto[],
  ): Promise<void> {
    if (sections.length === 0) return
    const rows = sections.map(({ id, title, orderIndex }) => ({
      id,
      classId,
      title,
      orderIndex,
    }))
    await manager.upsert(Section, rows, ['id'])
  }

  private async upsertItems(
    manager: EntityManager,
    sections: readonly SaveSectionDto[],
  ): Promise<void> {
    const rows = sections.flatMap((section) =>
      section.items.map((item) => ({
        id: item.id,
        sectionId: section.id,
        itemType: item.itemType,
        title: item.title,
        externalUrl: item.externalUrl ?? null,
        orderIndex: item.orderIndex,
        documentId: item.documentId ?? null,
        assignmentId: item.assignmentId ?? null,
      })),
    )
    if (rows.length === 0) return
    await manager.upsert(SectionItem, rows, ['id'])
  }

  /** Returns true when the student is enrolled in the class. */
  async isStudentEnrolled(classId: string, studentId: string): Promise<boolean> {
    return this.sectionOrmRepository.manager.exists(ClassStudent, {
      where: { classId, studentId },
    })
  }
}
