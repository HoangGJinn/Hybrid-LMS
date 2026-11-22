import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, IsNull, Not, Repository } from 'typeorm'
import type { SaveSectionDto } from '../dto/save-section.dto.js'
import { ItemCompletion } from '../entities/item-completion.entity.js'
import { SectionItem } from '../entities/section-item.entity.js'
import { Section } from '../entities/section.entity.js'
import { ItemType } from '../enums/item-type.enum.js'
import { emptyToNull } from '../../../common/utils/string.util.js'

/** Fields of a section that can change one by one; `undefined` means "leave as is". */
export interface SectionPatch {
  title?: string
  description?: string | null
  isVisible?: boolean
}

/** Fields of an item that can change one by one; `undefined` means "leave as is". */
export interface ItemPatch {
  title?: string
  externalUrl?: string | null
  isVisible?: boolean
}

/** A new item; its order is decided by the repository (always last). `isVisible` left out means the column default (visible). */
export interface NewItem {
  id: string
  itemType: ItemType
  title: string
  externalUrl: string | null
  documentId: string | null
  assignmentId: string | null
  examId: string | null
  isVisible?: boolean
}

const isEmptyPatch = (patch: object): boolean =>
  Object.values(patch).every((value) => value === undefined)

/** All TypeORM access for sections and their items. */
@Injectable()
export class SectionRepository {
  constructor(
    @InjectRepository(Section)
    private readonly sectionOrmRepository: Repository<Section>,
    @InjectRepository(SectionItem)
    private readonly itemOrmRepository: Repository<SectionItem>,
    @InjectRepository(ItemCompletion)
    private readonly completionOrmRepository: Repository<ItemCompletion>,
  ) {}

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
      where: { sectionId: In(sectionIds), deletedAt: IsNull() },
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

  // ----- one-change-at-a-time editing (auto-save) -----

  /** The section, only when it belongs to the class. */
  async findSection(classId: string, sectionId: string): Promise<Section | null> {
    return this.sectionOrmRepository.findOne({ where: { id: sectionId, classId } })
  }

  /** The item, only when it sits in the section. */
  async findItem(sectionId: string, itemId: string): Promise<SectionItem | null> {
    return this.itemOrmRepository.findOne({
      where: { id: itemId, sectionId, deletedAt: IsNull() },
    })
  }

  async itemExists(itemId: string): Promise<boolean> {
    return this.itemOrmRepository.exists({ where: { id: itemId } })
  }

  async updateSection(sectionId: string, patch: SectionPatch): Promise<void> {
    if (isEmptyPatch(patch)) return
    await this.sectionOrmRepository.update({ id: sectionId }, patch)
  }

  async deleteSection(sectionId: string): Promise<void> {
    await this.sectionOrmRepository.delete({ id: sectionId })
  }

  /**
   * Counts the items whose real content (file, assignment, exam) lives in another module.
   * Soft-deleted ones count too: deleting the section would erase the rows the clean-up job still needs.
   */
  async countLinkedItems(sectionId: string): Promise<number> {
    return this.itemOrmRepository.count({
      where: { sectionId, itemType: Not(ItemType.VIDEO) },
    })
  }

  /** Numbers the sections 1..n in the given order, inside one transaction. */
  async setSectionOrder(classId: string, orderedIds: string[]): Promise<void> {
    await this.sectionOrmRepository.manager.transaction(async (manager) => {
      for (const [index, id] of orderedIds.entries()) {
        await manager.update(Section, { id, classId }, { orderIndex: index + 1 })
      }
    })
  }

  /** Appends an item after the last one of the section, inside one transaction. */
  async createItemAtEnd(sectionId: string, item: NewItem): Promise<SectionItem> {
    return this.itemOrmRepository.manager.transaction(async (manager) => {
      const raw = await manager
        .getRepository(SectionItem)
        .createQueryBuilder('item')
        .select('COALESCE(MAX(item.orderIndex), 0)', 'maxOrder')
        .where('item.sectionId = :sectionId', { sectionId })
        .getRawOne<{ maxOrder: number | string }>()
      const orderIndex = Number(raw?.maxOrder ?? 0) + 1
      return manager.save(manager.create(SectionItem, { ...item, sectionId, orderIndex }))
    })
  }

  async updateItem(itemId: string, patch: ItemPatch): Promise<void> {
    if (isEmptyPatch(patch)) return
    await this.itemOrmRepository.update({ id: itemId }, patch)
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.itemOrmRepository.delete({ id: itemId })
  }

  /** Numbers the items of a section 1..n in the given order, inside one transaction. */
  async setItemOrder(sectionId: string, orderedIds: string[]): Promise<void> {
    await this.itemOrmRepository.manager.transaction(async (manager) => {
      for (const [index, id] of orderedIds.entries()) {
        await manager.update(SectionItem, { id, sectionId }, { orderIndex: index + 1 })
      }
    })
  }

  // ----- student completion -----

  /** The ids, among the given items, that the student has completed. */
  async findCompletedItemIds(studentId: string, itemIds: string[]): Promise<Set<string>> {
    if (itemIds.length === 0) return new Set()
    const rows = await this.completionOrmRepository.find({
      select: { sectionItemId: true },
      where: { studentId, sectionItemId: In(itemIds) },
    })
    return new Set(rows.map((row) => row.sectionItemId))
  }

  /** The item (with its section loaded), only when that section belongs to the class. */
  async findItemInClass(classId: string, itemId: string): Promise<SectionItem | null> {
    return this.itemOrmRepository.findOne({
      where: { id: itemId, deletedAt: IsNull(), section: { classId } },
      relations: { section: true },
    })
  }

  /** Idempotent: completing an already completed item changes nothing. */
  async markCompleted(studentId: string, itemId: string): Promise<void> {
    const alreadyDone = await this.completionOrmRepository.exists({
      where: { studentId, sectionItemId: itemId },
    })
    if (alreadyDone) return
    await this.completionOrmRepository.insert({
      studentId,
      sectionItemId: itemId,
      completedAt: new Date(),
    })
  }

  async unmarkCompleted(studentId: string, itemId: string): Promise<void> {
    await this.completionOrmRepository.delete({ studentId, sectionItemId: itemId })
  }

  // ----- legacy: replace everything at once (deprecated, kept for older clients) -----

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
      .andWhere('deleted_at IS NULL')
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
    const rows = sections.map(({ id, title, description, orderIndex }) => ({
      id,
      classId,
      title,
      description: emptyToNull(description),
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
        examId: item.examId ?? null,
      })),
    )
    if (rows.length === 0) return
    await manager.upsert(SectionItem, rows, ['id'])
  }
}